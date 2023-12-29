import WDIOReporter, { AfterCommandArgs, RunnerStats, SuiteStats, TestStats } from "@wdio/reporter";
import { AzureReporterOptions, Screenshot, TestReport } from "./types.js";
import { Utils } from "./utils.js";
import { AzureTestResultOutcome, AzureTestRunStatus, AzureTestStatusCucumberStatusMap } from "./constants.js";
import fs from "fs";
import { DesiredCapabilities } from "@wdio/types/build/Capabilities";
import {
  TestActionResultModel,
  TestCaseResult,
  TestIterationDetailsModel,
} from "azure-devops-node-api/interfaces/TestInterfaces";

export default class AzureDevopsReporter extends WDIOReporter {
  private reporterOptions: AzureReporterOptions;
  private azureConfigurationId: string;
  private utils: Utils;
  private azureTestResult: TestCaseResult[];
  private screenshots: Screenshot[];

  private currentTestCaseAzureID: string;
  private currentIterationID: number;
  private currentActionPathIndex: number;

  constructor(options: AzureReporterOptions) {
    if (!options) {
      throw new Error("Invalid Azure Reporter Configuration");
    }
    const { outputDir = "./reports/azure", ...rest } = options;
    super({ ...rest, outputDir });
    this.reporterOptions = { ...rest, outputDir };

    this.utils = new Utils();
    this.azureTestResult = [];
    this.azureConfigurationId = "";
    this.screenshots = [];
    this.currentTestCaseAzureID = "";
    this.currentIterationID = 0;
    this.currentActionPathIndex = 1;
  }

  onRunnerStart(runner: RunnerStats) {
    if (!runner.isMultiremote) {
      const capabilities = runner.config.capabilities ?? runner.capabilities;
      this.azureConfigurationId = this.utils.getAzureConfigurationIDByCapability(
        capabilities as DesiredCapabilities,
        this.reporterOptions.azureConfigurationCapabilities
      );
    }

    this.outputStream = fs.createWriteStream(`${this.options.outputDir}/result-${runner.sessionId}.json`);
  }

  onRunnerEnd(): void {
    const report: TestReport = {
      azureConfigurationId: this.azureConfigurationId,
      testResults: this.azureTestResult,
      screenshots: this.screenshots,
    };
    this.write(JSON.stringify(report, null, 2));
  }

  onSuiteStart(suite: SuiteStats) {
    const isScenario = suite.type === "scenario";

    if (isScenario) {
      const testCaseAzureID = String(this.utils.parseCaseID(suite.tags, this.reporterOptions.caseIdRegex));
      if (testCaseAzureID !== this.currentTestCaseAzureID) {
        this.currentTestCaseAzureID = testCaseAzureID;
        this.azureTestResult.push({
          testCase: { id: testCaseAzureID },
          iterationDetails: [],
          outcome: AzureTestResultOutcome.Passed,
          startedDate: suite.start,
        });
        this.currentIterationID = 1;
        this.currentActionPathIndex = 1;
      } else {
        this.currentIterationID++;
      }
    }
  }

  onTestStart(test: TestStats): void {
    const isStep = test.type === "test";
    if (isStep) this.currentActionPathIndex++;
  }

  onSuiteEnd(suite: SuiteStats) {
    const isScenario = suite.type === "scenario";
    const isFeature = suite.type === "feature";

    if (isScenario) {
      if (this.azureTestResult.length > 1) {
        const lastFinishTestResult = this.azureTestResult[this.azureTestResult.length - 2];
        const lastIteration = lastFinishTestResult.iterationDetails
          ? lastFinishTestResult.iterationDetails[lastFinishTestResult.iterationDetails.length - 1]
          : undefined;

        lastFinishTestResult.state = AzureTestRunStatus.COMPLETED;
        lastFinishTestResult.completedDate = lastIteration?.completedDate;
      }

      const iterationDetailsLength =
        this.azureTestResult[this.azureTestResult.length - 1].iterationDetails?.length ?? 0;
      const currentIterationId = iterationDetailsLength + 1;

      let isSuitePassed = true;

      const actionResults: TestActionResultModel[] = [];
      // The azure step ID value for first step starts with 2
      let actionPathIndex = 2;
      suite.tests.forEach((test: TestStats) => {
        const actionPath = this.utils.convertIdToAzureActionPathId(actionPathIndex);
        const testArgument = this.utils.formatTestArgument(test.argument);

        actionResults.push({
          iterationId: currentIterationId,
          actionPath: actionPath,
          stepIdentifier: String(actionPathIndex),
          outcome: AzureTestStatusCucumberStatusMap[test.state],
          startedDate: test.start,
          completedDate: test.end,
          durationInMs: test._duration,
          errorMessage: `Step: ${test.title}\n\n${testArgument ? testArgument + "\n\n" : ""}${
            test.error?.stack ? this.utils.removeColorCode(test.error.stack) : ""
          }`,
        });
        actionPathIndex++;

        if (test.state === "failed") {
          isSuitePassed = false;
        }
      });

      const iterationModel: TestIterationDetailsModel = {
        outcome: isSuitePassed
          ? AzureTestStatusCucumberStatusMap.passed
          : AzureTestStatusCucumberStatusMap.failed,
        id: currentIterationId,
        startedDate: suite.start,
        completedDate: suite.end,
        /* Must be converted from ms to hundreds of microseconds 
        to display correctly on the iteration detail section.
        This may be a bug from azure side.
        */
        durationInMs: suite._duration * 10000,
        actionResults: actionResults,
      };

      if (!isSuitePassed)
        this.azureTestResult[this.azureTestResult.length - 1].outcome = AzureTestResultOutcome.Failed;

      this.azureTestResult[this.azureTestResult.length - 1].iterationDetails?.push(iterationModel);

      this.currentActionPathIndex = 1;
    } else if (isFeature) {
      const lastFinishTestResult = this.azureTestResult[this.azureTestResult.length - 1];
      const lastIteration = lastFinishTestResult.iterationDetails
        ? lastFinishTestResult.iterationDetails[lastFinishTestResult.iterationDetails.length - 1]
        : undefined;

      lastFinishTestResult.state = AzureTestRunStatus.COMPLETED;

      const resultCompletedDate = lastIteration?.completedDate;
      lastFinishTestResult.completedDate = resultCompletedDate;
    }
  }

  onAfterCommand(command: AfterCommandArgs) {
    const isScreenshot = this.utils.isScreenshotCommand(command);

    if (isScreenshot && command.result?.value) {
      this.screenshots.push({
        testCaseId: this.currentTestCaseAzureID,
        iterationId: this.currentIterationID,
        actionPath: this.utils.convertIdToAzureActionPathId(this.currentActionPathIndex),
        base64encodedContent: command.result?.value,
      });
    }
  }
}

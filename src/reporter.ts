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
  private screenshots: { [testcaseId: string]: Screenshot };

  private currentSuiteTitle?: string;
  private currentFailedScreenshot?: string;

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
    this.screenshots = {};
  }

  onRunnerStart(runner: RunnerStats) {
    if (!runner.isMultiremote) {
      this.azureConfigurationId = this.utils.getAzureConfigurationIDByCapability(
        runner.config.capabilities as DesiredCapabilities,
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

  onSuiteEnd(suite: SuiteStats) {
    const isScenario = suite.type === "scenario";
    const isFeature = suite.type === "feature";

    if (isScenario) {
      if (suite.title !== this.currentSuiteTitle) {
        this.currentSuiteTitle = suite.title;
        this.azureTestResult.push({
          testCase: { id: String(this.utils.parseCaseID(suite.tags, this.reporterOptions.caseIdRegex)) },
          iterationDetails: [],
          outcome: AzureTestResultOutcome.Passed,
        });

        if (this.azureTestResult.length > 1) {
          this.azureTestResult[this.azureTestResult.length - 2].state = AzureTestRunStatus.COMPLETED;
        }
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
        actionResults.push({
          iterationId: currentIterationId,
          actionPath: actionPath,
          stepIdentifier: String(actionPathIndex),
          outcome: AzureTestStatusCucumberStatusMap[test.state],
          startedDate: test.start,
          completedDate: test.end,
          errorMessage: test.error?.stack ? this.utils.removeColorCode(test.error.stack) : "",
        });
        actionPathIndex++;

        if (test.state === "failed") {
          isSuitePassed = false;

          if (this.currentFailedScreenshot) {
            const currentTestCaseId =
              this.azureTestResult[this.azureTestResult.length - 1].testCase?.id ?? "";
            this.screenshots[currentTestCaseId] = {
              iterationId: currentIterationId,
              actionPath: actionPath,
              base64encodedContent: this.currentFailedScreenshot ?? "",
            };
          }
        }
      });

      const iterationModel: TestIterationDetailsModel = {
        outcome: isSuitePassed
          ? AzureTestStatusCucumberStatusMap.passed
          : AzureTestStatusCucumberStatusMap.failed,
        id: currentIterationId,
        startedDate: suite.start,
        completedDate: suite.end,
        durationInMs: suite._duration,
        actionResults: actionResults,
      };

      if (!isSuitePassed)
        this.azureTestResult[this.azureTestResult.length - 1].outcome = AzureTestResultOutcome.Failed;

      this.azureTestResult[this.azureTestResult.length - 1].iterationDetails?.push(iterationModel);
    } else if (isFeature) {
      this.azureTestResult[this.azureTestResult.length - 1].state = AzureTestRunStatus.COMPLETED;
    }
  }

  onAfterCommand(command: AfterCommandArgs) {
    const isScreenshot = this.utils.isScreenshotCommand(command);

    if (isScreenshot && command.result?.value) {
      this.currentFailedScreenshot = command.result?.value;
    }
  }
}

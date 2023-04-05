import WDIOReporter, { RunnerStats, SuiteStats, TestStats } from "@wdio/reporter";
import { AzureReporterOptions } from "./types";
import * as TestInterfaces from "azure-devops-node-api/interfaces/TestInterfaces";
import { Utils } from "./utils.js";
import { AzureTestStatusCucumberStatusMap } from "./constants.js";
import fs from "fs";
import { DesiredCapabilities } from "@wdio/types/build/Capabilities";

export default class AzureDevopsReporter extends WDIOReporter {
  private reporterOptions: AzureReporterOptions;
  private azureConfigurationId: string;
  private utils: Utils;
  private azureTestResult: TestInterfaces.TestCaseResult[];
  private currentSuiteTitle?: string;

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
    this.write(
      JSON.stringify(
        {
          azureConfigurationId: this.azureConfigurationId,
          testResults: this.azureTestResult,
        },
        null,
        2
      )
    );
  }

  onSuiteEnd(suite: SuiteStats) {
    const isScenario = suite.type === "scenario";
    if (isScenario) {
      if (suite.title !== this.currentSuiteTitle) {
        this.currentSuiteTitle = suite.title;
        this.azureTestResult.push({
          id: this.utils.parseCaseID(suite.tags, this.reporterOptions.caseIdRegex),
          iterationDetails: [],
        });
      }

      const currentTestResultIndex = this.azureTestResult.length - 1;
      const iterationDetailsLength =
        this.azureTestResult[currentTestResultIndex].iterationDetails?.length ?? 0;
      const currentIterationId = iterationDetailsLength + 1;

      let isSuitePassed = true;

      const actionResults: TestInterfaces.TestActionResultModel[] = [];
      // The azure step ID value for first step starts with 2
      let actionPathIndex = 2;
      suite.tests.forEach((test: TestStats) => {
        actionResults.push({
          iterationId: currentIterationId,
          actionPath: this.utils.convertIdToAzureActionPathId(actionPathIndex),
          stepIdentifier: String(actionPathIndex),
          outcome: AzureTestStatusCucumberStatusMap[test.state],
          startedDate: test.start,
          completedDate: test.end,
          errorMessage: test.error?.stack ? this.utils.removeColorCode(test.error.stack) : "",
        });
        actionPathIndex++;

        if (test.state === "failed") isSuitePassed = false;
      });

      const iterationModel: TestInterfaces.TestIterationDetailsModel = {
        outcome: isSuitePassed
          ? AzureTestStatusCucumberStatusMap.passed
          : AzureTestStatusCucumberStatusMap.failed,
        id: currentIterationId,
        startedDate: suite.start,
        completedDate: suite.end,
        durationInMs: suite._duration,
        actionResults: actionResults,
      };

      this.azureTestResult[currentTestResultIndex].iterationDetails?.push(iterationModel);
    }
  }
}

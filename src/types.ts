import { Capabilities } from "@wdio/types";
import { TestCaseResult } from "azure-devops-node-api/interfaces/TestInterfaces";

export interface AzureReporterOptions {
  outputDir?: string;
  azureConfigurationCapabilities: AzureConfigurationCapability[];
  caseIdRegex?: string;
}

export interface AzureConfigurationCapability {
  azureConfigId: string;
  capabilities: Capabilities.DesiredCapabilities;
}

export interface TestReport {
  azureConfigurationId: string;
  testResults: TestCaseResult[];
}

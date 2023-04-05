import { Capabilities } from "@wdio/types";

export interface AzureReporterOptions {
  outputDir?: string;
  pat: string;
  organizationUrl: string;
  projectId: string;
  planId: number;
  suiteId: number;
  azureConfigurationCapabilities: AzureConfigurationCapability[];
  runName: string;
  caseIdRegex?: string;
}

export interface AzureConfigurationCapability {
  azureConfigId: string;
  capabilities: Capabilities.DesiredCapabilities;
}

export interface ITestResult {
  testCaseId: string;
  result: string;
  message: string;
  azureConfigurationId: string;
}

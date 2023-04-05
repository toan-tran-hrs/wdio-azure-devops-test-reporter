import { Capabilities } from "@wdio/types";

export interface AzureReporterOptions {
  outputDir?: string;
  azureConfigurationCapabilities: AzureConfigurationCapability[];
  caseIdRegex?: string;
}

export interface AzureConfigurationCapability {
  azureConfigId: string;
  capabilities: Capabilities.DesiredCapabilities;
}

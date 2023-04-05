export enum AzureTestStatusCucumberStatusMap {
  passed = "Passed",
  failed = "Failed",
  skipped = "NotExecuted",
  pending = "Unspecified",
}

// Control characters is not a mistake
// eslint-disable-next-line no-control-regex
export const colorCodeRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

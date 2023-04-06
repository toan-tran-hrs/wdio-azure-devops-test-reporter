export enum AzureTestStatusCucumberStatusMap {
  passed = "Passed",
  failed = "Failed",
  skipped = "NotExecuted",
  pending = "Unspecified",
}

export enum AzureTestRunStatus {
  INPROGRESS = "InProgress",
  COMPLETED = "Completed",
  ABORTED = "Aborted",
}

export enum AzureTestResultOutcome {
  Unspecified = "Unspecified",
  None = "None",
  Passed = "Passed",
  Failed = "Failed",
  Inconclusive = "Inconclusive",
  Timeout = "Timeout",
  Aborted = "Aborted",
  Blocked = "Blocked",
  NotExecuted = "NotExecuted",
  Warning = "Warning",
  Error = "Error",
  NotApplicable = "NotApplicable",
  Paused = "Paused",
  InProgress = "InProgress",
  NotImpacted = "NotImpacted",
}

// Control characters is not a mistake
// eslint-disable-next-line no-control-regex
export const colorCodeRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

import { Argument, CommandArgs, Tag } from "@wdio/reporter";
import { Capabilities } from "@wdio/types";
import { AzureConfigurationCapability } from "./types";
import { colorCodeRegex } from "./constants.js";
import { markdownTable } from "markdown-table";

export class Utils {
  public convertIdToAzureActionPathId(id: number): string {
    const actionPathIdLength = 8;
    return id.toString(16).toUpperCase().padStart(actionPathIdLength, "0");
  }

  public parseCaseID(tags: string[] | Tag[] | undefined, idMatchingRegex?: string): number {
    if (tags) {
      let pattern = /@?AzureID-(\d+)/g;
      if (idMatchingRegex) {
        pattern = new RegExp(idMatchingRegex, "g");
      }

      for (const tag of tags) {
        const matchInfo = pattern.exec(typeof tag === "string" ? tag : tag.name);
        if (matchInfo != null) {
          return Number(matchInfo[1]);
        }
      }
    }
    return 0;
  }

  public getAzureConfigurationIDByCapability(
    runnerCapabilities: Capabilities.DesiredCapabilities,
    azureConfigurationCapabilities: AzureConfigurationCapability[]
  ): string {
    const runnerCapabilityFields = Object.keys(runnerCapabilities);
    const runnerCapabilityValues = Object.values(runnerCapabilities);

    const matchedId = azureConfigurationCapabilities.find(
      (azureConfigurationCapability: AzureConfigurationCapability) => {
        const areCapFieldsMatched = Object.keys(azureConfigurationCapability.capabilities).every(
          (capabilityField: string) =>
            runnerCapabilityFields.find(
              (runnerCapabilityField: string) =>
                capabilityField.toLowerCase() === runnerCapabilityField.toLowerCase()
            )
        );

        const areCapValuesMatched = Object.values(azureConfigurationCapability.capabilities).every(
          (capabilityValue: unknown) =>
            runnerCapabilityValues.find(
              (runnerCapabilityValue: unknown) =>
                String(capabilityValue).toLowerCase() === String(runnerCapabilityValue).toLowerCase()
            )
        );

        return areCapFieldsMatched && areCapValuesMatched;
      }
    )?.azureConfigId;
    return matchedId ?? "";
  }

  public removeColorCode(error: string): string {
    return error.replace(colorCodeRegex, "");
  }

  public isScreenshotCommand(command: CommandArgs): boolean {
    const isScrenshotEndpoint = /\/session\/[^/]*(\/element\/[^/]*)?\/screenshot/;

    return (
      // WebDriver protocol
      (command.endpoint && isScrenshotEndpoint.test(command.endpoint)) ||
      // DevTools protocol
      command.command === "takeScreenshot"
    );
  }

  public formatTestArgument(argument: string | Argument | undefined): string {
    if (argument) {
      if (typeof argument === "string") {
        return argument;
      } else {
        const table = argument.rows?.map((row) => row.cells);
        const formattedTable = table ? markdownTable(table) : "";

        // Remove the seperator line between table header and table body
        const indexOfFirstLineBreak = formattedTable.indexOf("\n");
        const indexOfSecondLineBreak = formattedTable.indexOf("\n", indexOfFirstLineBreak + 1);
        const header = formattedTable.substring(0, indexOfFirstLineBreak);
        const body = formattedTable.substring(indexOfSecondLineBreak + 1);

        return `${header}\n${body}`.replace(/\n/g, "\n\n");
      }
    }
    return "";
  }
}

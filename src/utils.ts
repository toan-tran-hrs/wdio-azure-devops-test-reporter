import { Tag } from "@wdio/reporter";
import { Capabilities } from "@wdio/types";
import { AzureConfigurationCapability } from "./types";
import { colorCodeRegex } from "./constants.js";

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
}

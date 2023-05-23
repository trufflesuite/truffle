//these imports aren't actually necessary, but why not :)
import util from "util";
import { setTimeout } from "timers";
import type * as Types from "./types";

export function makeFilename(name: string, extension: string = ".sol"): string {
  if (!name) {
    return "Contract" + extension;
  }
  if (name.endsWith(extension)) {
    return name;
  } else {
    return name + extension;
  }
}

export const makeTimer: (milliseconds: number) => Promise<void> =
  util.promisify(setTimeout);

export function includeDefaults(
  settings: Types.SolcSettings
): Types.SolcSettings {
  if (settings.optimizer) {
    return {
      ...settings,
      optimizer: {
        ...settings.optimizer,
        enabled: settings.optimizer.enabled ?? false,
        runs: settings.optimizer.runs ?? 200
      }
    };
  } else {
    return {
      ...settings,
      optimizer: { enabled: false, runs: 200 }
    };
  }
}

interface RemoveLibrariesOptions {
  alsoRemoveCompilationTarget?: boolean;
  alsoRemoveOutputSelection?: boolean;
}

export function removeLibraries(
  settings: Types.SolcSettings,
  options?: RemoveLibrariesOptions
): Types.SolcSettings {
  let copySettings: Types.SolcSettings = { ...settings };
  delete copySettings.libraries;
  if (options?.alsoRemoveCompilationTarget) {
    delete copySettings.compilationTarget;
  }
  if (options?.alsoRemoveOutputSelection) {
    delete copySettings.outputSelection;
  }
  return copySettings;
}

export class InvalidNetworkError extends Error {
  public networkId: number;
  public fetcherName: string;
  constructor(networkId: number, fetcherName: string) {
    super(`Invalid network ID ${networkId} for fetcher ${fetcherName}`);
    this.networkId = networkId;
    this.fetcherName = fetcherName;
    this.name = "InvalidNetworkError";
  }
}

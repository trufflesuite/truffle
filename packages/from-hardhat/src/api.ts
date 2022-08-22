import { promises as fs } from "fs";
import semver from "semver";

import type * as Hardhat from "hardhat/types";
import type * as Common from "@truffle/compile-common";
import type TruffleConfig from "@truffle/config";

import {
  supportedHardhatVersionRange,
  supportedHardhatBuildInfoFormats
} from "./constants";
import * as Compilation from "./compilation";
import * as Config from "./config";

import {
  checkHardhat,
  askHardhatConsole,
  askHardhatVersion
} from "./ask-hardhat";
import { EnvironmentOptions } from "./options";

/**
 * Checks for the existence of a Hardhat project configuration and asserts
 * that the local installed version of Hardhat matches this package's
 * supported version range.
 *
 * @param options to control process environment (e.g. working directory)
 * @return Promise<void> when expectation holds
 * @throws NotHardhatError when not in a Hardhat project directory
 * @throws IncompatibleHardhatError if Hardhat has unsupported version
 */
export const expectHardhat = async (
  options?: EnvironmentOptions
): Promise<void> => {
  const isHardhat = await checkHardhat(options);

  if (!isHardhat) {
    throw new NotHardhatError();
  }

  const hardhatVersion = await askHardhatVersion(options);

  if (!semver.satisfies(hardhatVersion, supportedHardhatVersionRange)) {
    throw new IncompatibleHardhatVersionError(hardhatVersion);
  }
};

/**
 * Thrown when no Hardhat project is found
 */
export class NotHardhatError extends Error {
  constructor() {
    super("Current working directory is not part of a Hardhat project");
  }
}

/**
 * Thrown when Hardhat was detected but with an incompatible version
 */
export class IncompatibleHardhatVersionError extends Error {
  constructor(detectedVersion: string) {
    super(
      `Expected Hardhat version compatible with ${supportedHardhatVersionRange}, got: ${detectedVersion}`
    );
  }
}

/**
 * Constructs a @truffle/config object based on the Hardhat config.
 *
 * WARNING: except for fields documented here, the values present on the
 * returned @truffle/config object MUST be regarded as unsafe to use.
 *
 * The returned `config` is defined to contain the following:
 *
 *   - `config.networks` with configurations for all Hardhat-configured
 *     networks, provided:
 *       - The configured network is not the built-in `hardhat` network
 *       - The configured network defines a `url` property
 *
 *     Note: this function ignores all properties other than `url`,
 *     including any information that can be used for computing
 *     cryptographic signatures. THIS FUNCTION DOES NOT READ PRIVATE KEYS.
 *
 * Suffice to say:
 *
 * THIS FUNCTION'S BEHAVIOR IS EXPERIMENTAL AND SHOULD ONLY BE USED IN
 * SPECIFICALLY KNOWN-SUPPORTED USE CASES (like reading for configured
 * network urls)
 *
 * @param options to control process environment (e.g. working directory)
 * @return Promise<TruffleConfig>
 *
 * @dev This function shells out to `npx hardhat console` to ask the Hardhat
 *      runtime environment for a fully populated config object.
 */
export const prepareConfig = async (
  options?: EnvironmentOptions
): Promise<TruffleConfig> => {
  const networkUrls = (await askHardhatConsole(
    Config.networkUrlsQuery,
    options
  )) as Config.NetworkUrl[];

  return Config.fromNetworkUrls(networkUrls);
};

/**
 * Constructs an array of @truffle/compile-common `Compilation` objects
 * corresponding one-to-one with Hardhat's persisted results of each solc
 * compilation.
 *
 * WARNING: this function only supports Hardhat projects written entirely
 * in solc-compatible languages (Solidity, Yul). Behavior of this function
 * for Hardhat projects using other languages is undefined.
 *
 * @param options to control process environment (e.g. working directory)
 * @return Promise<Compilation[]> from @truffle/compile-common
 *
 * @dev This function shells out to `npx hardhat console` to ask the Hardhat
 *      runtime environment for the location of the project build info
 *      files
 */
export const prepareCompilations = async (
  options?: EnvironmentOptions
): Promise<Common.Compilation[]> => {
  const compilations = [];

  const buildInfoPaths = (await askHardhatConsole(
    `artifacts.getBuildInfoPaths()`,
    options
  )) as string[];

  for (const buildInfoPath of buildInfoPaths) {
    const buildInfo: Hardhat.BuildInfo = JSON.parse(
      (await fs.readFile(buildInfoPath)).toString()
    );

    const { _format } = buildInfo;

    if (!supportedHardhatBuildInfoFormats.has(_format)) {
      throw new IncompatibleHardhatBuildInfoFormatError(_format);
    }

    const compilation = Compilation.fromBuildInfo(buildInfo);

    compilations.push(compilation);
  }

  return compilations;
};

/**
 * Thrown when the build-info format detected has an incompatible version
 */
export class IncompatibleHardhatBuildInfoFormatError extends Error {
  constructor(detectedFormat: string) {
    super(
      `Expected build-info to be one of ["${[
        ...supportedHardhatBuildInfoFormats
      ].join('", "')}"], got: "${detectedFormat}"`
    );
  }
}

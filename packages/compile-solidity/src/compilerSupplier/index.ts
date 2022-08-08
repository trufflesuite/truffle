import path from "path";
import fs from "fs";
import semver from "semver";
import { StrategyOptions } from "./types";
import { Docker, Local, Native, VersionRange } from "./loadingStrategies";

const defaultSolcVersion = "0.5.16";

type CompilerSupplierStrategy =
  | Docker
  | Native
  | Local
  | VersionRange
  | undefined;

export class CompilerSupplier {
  private version: string;
  private docker: boolean;
  private strategyOptions: StrategyOptions;

  constructor({ events, solcConfig }) {
    const { version, docker, compilerRoots, dockerTagsUrl, spawn } = solcConfig;
    this.version = version ? version : defaultSolcVersion;
    this.docker = docker;
    this.strategyOptions = {};
    if (version) this.strategyOptions.version = this.version;
    if (dockerTagsUrl) this.strategyOptions.dockerTagsUrl = dockerTagsUrl;
    if (compilerRoots) this.strategyOptions.compilerRoots = compilerRoots;
    if (events) this.strategyOptions.events = events;
    if (spawn) this.strategyOptions.spawn = spawn;
  }

  async load() {
    const userSpecification = this.version;

    let strategy: CompilerSupplierStrategy;
    const useDocker = this.docker;
    const useNative = userSpecification === "native";
    const useSpecifiedLocal =
      userSpecification &&
      (fs.existsSync(userSpecification) || path.isAbsolute(userSpecification));
    const isValidVersionRange = semver.validRange(userSpecification);

    if (useDocker) {
      strategy = new Docker(this.strategyOptions);
    } else if (useNative) {
      strategy = new Native();
    } else if (useSpecifiedLocal) {
      strategy = new Local();
    } else if (isValidVersionRange) {
      strategy = new VersionRange(this.strategyOptions);
    }

    if (strategy) {
      const solc = await strategy.load(userSpecification);
      return { solc };
    } else {
      throw new BadInputError(userSpecification);
    }
  }

  /**
   * This function lists known solc versions, possibly asynchronously to
   * account for APIs with paginated data (namely, Docker Hub)
   *
   * @return Promise<{
   *           prereleases: AsyncIterable<string>;
   *           releases: AsyncIterable<string>;
   *           latestRelease: string;
   *         }>
   */
  async list() {
    const userSpecification = this.version;

    let strategy: Docker | Native | Local | VersionRange | undefined;
    const useDocker = this.docker;
    const useNative = userSpecification === "native";
    const useSpecifiedLocal =
      userSpecification &&
      (fs.existsSync(userSpecification) || path.isAbsolute(userSpecification));
    const isValidVersionRange =
      semver.validRange(userSpecification) || userSpecification === "pragma";
    if (useDocker) {
      strategy = new Docker(this.strategyOptions);
    } else if (useNative) {
      strategy = new Native();
    } else if (useSpecifiedLocal) {
      strategy = new Local();
    } else if (isValidVersionRange) {
      strategy = new VersionRange(this.strategyOptions);
    }

    if (!strategy) {
      throw new BadInputError(userSpecification);
    }

    if ("list" in strategy) {
      return await strategy.list();
    }
    throw new StrategyCannotListVersionsError(strategy.constructor.name);
  }

  static getDefaultVersion() {
    return defaultSolcVersion;
  }
}

export class BadInputError extends Error {
  constructor(input: string) {
    const message =
      `Could not find a compiler version matching ${input}. ` +
      `compilers.solc.version option must be a string specifying:\n` +
      `   - a path to a locally installed solcjs\n` +
      `   - a solc version or range (ex: '0.4.22' or '^0.5.0')\n` +
      `   - a docker image name (ex: 'stable')\n` +
      `   - 'native' to use natively installed solc\n`;
    super(message);
  }
}

export class StrategyCannotListVersionsError extends Error {
  constructor(strategyName: string) {
    super(`Cannot list versions for strategy ${strategyName}`);
  }
}

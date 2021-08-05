const path = require("path");
const fs = require("fs");
const semver = require("semver");

const { Docker, Local, Native, VersionRange } = require("./loadingStrategies");

const defaultSolcVersion = "0.5.16";

class CompilerSupplier {
  constructor({ events, solcConfig }) {
    const { version, docker, compilerRoots, spawn } = solcConfig;
    this.events = events;
    this.version = version ? version : defaultSolcVersion;
    this.docker = docker;
    this.compilerRoots = compilerRoots;
    this.strategyOptions = {};
    if (version) this.strategyOptions.version = this.version;
    if (docker) this.strategyOptions.docker = compilerRoots;
    if (compilerRoots) this.strategyOptions.compilerRoots = compilerRoots;
    if (events) this.strategyOptions.events = events;
    if (spawn) this.strategyOptions.spawn = spawn;
  }

  async load() {
    const userSpecification = this.version;

    let strategy;
    const useDocker = this.docker;
    const useNative = userSpecification === "native";
    const useSpecifiedLocal =
      userSpecification && this.fileExists(userSpecification);
    const isValidVersionRange = semver.validRange(userSpecification);

    if (useDocker) {
      strategy = new Docker(this.strategyOptions);
    } else if (useNative) {
      strategy = new Native(this.strategyOptions);
    } else if (useSpecifiedLocal) {
      strategy = new Local(this.strategyOptions);
    } else if (isValidVersionRange) {
      strategy = new VersionRange(this.strategyOptions);
    }

    if (strategy) {
      const solc = await strategy.load(userSpecification);
      return { solc };
    } else {
      throw this.badInputError(userSpecification);
    }
  }

  async listVersions() {
    const userSpecification = this.version;

    let strategy;
    const useDocker = this.docker;
    const useNative = userSpecification === "native";
    const useSpecifiedLocal =
      userSpecification && this.fileExists(userSpecification);
    const isValidVersionRange = semver.validRange(userSpecification);

    if (useDocker) {
      strategy = new Docker(this.strategyOptions);
    } else if (useNative) {
      strategy = new Native(this.strategyOptions);
    } else if (useSpecifiedLocal) {
      strategy = new Local(this.strategyOptions);
    } else if (isValidVersionRange) {
      strategy = new VersionRange(this.strategyOptions);
    }

    if (!strategy) {
      throw this.badInputError(userSpecification);
    }

    if (!strategy.listVersions) {
      throw new Error(
        `Cannot list versions for strategy ${strategy.constructor.name}`
      );
    }

    return await strategy.listVersions();
  }

  static getDefaultVersion() {
    return defaultSolcVersion;
  }

  badInputError(userSpecification) {
    const message =
      `Could not find a compiler version matching ${userSpecification}. ` +
      `compilers.solc.version option must be a string specifying:\n` +
      `   - a path to a locally installed solcjs\n` +
      `   - a solc version or range (ex: '0.4.22' or '^0.5.0')\n` +
      `   - a docker image name (ex: 'stable')\n` +
      `   - 'native' to use natively installed solc\n`;
    return new Error(message);
  }

  fileExists(localPath) {
    return fs.existsSync(localPath) || path.isAbsolute(localPath);
  }
}

module.exports = CompilerSupplier;

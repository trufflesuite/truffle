const { execSync } = require("child_process");
const { normalizeSolcVersion } = require("../normalizeSolcVersion");
const { NoVersionError } = require("../errors");

export class Native {
  load() {
    const versionString = this.validateAndGetSolcVersion();
    const command = "solc --standard-json";
    const maxBuffer = 1024 * 1024 * 10;

    try {
      return {
        compile: options =>
          String(execSync(command, { input: options, maxBuffer })),
        version: () => versionString
      };
    } catch (error) {
      if (error.message === "No matching version found") {
        throw new NoVersionError(versionString);
      }
      throw error;
    }
  }

  validateAndGetSolcVersion() {
    let version;
    try {
      version = execSync("solc --version");
    } catch (error) {
      throw new NoNativeError(error);
    }
    return normalizeSolcVersion(version);
  }
}

export class NoNativeError extends Error {
  constructor(error: Error) {
    super("Could not execute local solc binary: " + error);
  }
}

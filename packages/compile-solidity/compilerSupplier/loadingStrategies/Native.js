const { execSync } = require("child_process");
const LoadingStrategy = require("./LoadingStrategy");
const VersionRange = require("./VersionRange");

class Native extends LoadingStrategy {
  load() {
    const versionString = this.validateAndGetSolcVersion();
    const command = "solc --standard-json";
    const maxBuffer = 1024 * 1024 * 10;

    try {
      return {
        compile: (options) =>
          String(execSync(command, { input: options, maxBuffer })),
        version: () => versionString,
      };
    } catch (error) {
      if (error.message === "No matching version found") {
        throw this.errors("noVersion", versionString);
      }
      throw new Error(error);
    }
  }

  validateAndGetSolcVersion() {
    let version;
    try {
      version = execSync("solc --version");
    } catch (error) {
      throw this.errors("noNative", null, error);
    }
    return new VersionRange(this.config).normalizeSolcVersion(version);
  }
}

module.exports = Native;

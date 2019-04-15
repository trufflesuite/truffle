const { execSync } = require("child_process");
const LoadingStrategy = require("./LoadingStrategy");
const VersionRange = require("./VersionRange");

class Native extends LoadingStrategy {
  load() {
    const versionString = this.validateAndGetSolcVersion();
    const command = "solc --standard-json";

    return new Promise((resolve, reject) => {
      try {
        resolve({
          compile: options => String(execSync(command, { input: options })),
          version: () => versionString
        });
      } catch (error) {
        if (error.message === "No matching version found") {
          reject(this.errors("noVersion", versionString));
        }
        reject(new Error(error));
      }
    });
  }

  validateAndGetSolcVersion() {
    let version;
    try {
      version = execSync("solc --version");
    } catch (error) {
      throw this.errors("noNative", null, error);
    }
    return new VersionRange().normalizeSolcVersion(version);
  }
}

module.exports = Native;

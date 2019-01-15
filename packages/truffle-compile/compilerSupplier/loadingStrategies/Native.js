const { execSync } = require("child_process");
const ora = require("ora");
const LoadingStrategy = require("./LoadingStrategy");
const VersionRange = require("./VersionRange");

class Native extends LoadingStrategy {
  load() {
    const versionString = this.validateAndGetSolcVersion();
    const command = "solc --standard-json";

    const commit = VersionRange.getCommitFromVersion(versionString);

    return VersionRange.getSolcByCommit(commit)
      .then(solcjs => {
        return {
          compile: options => String(execSync(command, { input: options })),
          version: () => versionString,
          importsParser: solcjs
        };
      })
      .catch(error => {
        if (error.message === "No matching version found") {
          throw this.errors("noVersion", versionString);
        }
        throw new Error(error);
      });
  }

  validateAndGetSolcVersion() {
    let version;
    try {
      version = execSync("solc --version");
    } catch (error) {
      throw this.errors("noNative", null, error);
    }
    return VersionRange.normalizeSolcVersion(version);
  }
}

module.exports = Native;

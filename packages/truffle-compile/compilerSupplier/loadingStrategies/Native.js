const { execSync } = require("child_process");
const LoadingStrategy = require("./LoadingStrategy");
const VersionRange = require("./VersionRange");

class Native extends LoadingStrategy {
  load() {
    const versionString = this.validateAndGetSolcVersion();
    const command = "solc --standard-json";

    const versionRange = new VersionRange();
    const commit = versionRange.getCommitFromVersion(versionString);
    return versionRange
      .getSolcByCommit(commit)
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
    return new VersionRange().normalizeSolcVersion(version);
  }
}

module.exports = Native;

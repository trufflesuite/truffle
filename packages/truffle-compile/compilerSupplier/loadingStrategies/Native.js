const { execSync } = require("child_process");
const LoadingStrategy = require("./LoadingStrategy");

class Native extends LoadingStrategy {
  load() {
    const versionString = this.validateAndGetSolcVersion();
    const command = "solc --standard-json";

    const commit = this.getCommitFromVersion(versionString);

    return this.getSolcForNativeOrDockerCompile(commit).then(solcjs => {
      return {
        compile: options => String(execSync(command, { input: options })),
        version: () => versionString,
        importsParser: solcjs
      };
    });
  }

  validateAndGetSolcVersion() {
    let version;
    try {
      version = execSync("solc --version");
    } catch (err) {
      throw this.errors("noNative", null, err);
    }

    return this.normalizeSolcVersion(version);
  }
}

module.exports = Native;

const { execSync } = require("child_process");
const LoadingStrategy = require("./LoadingStrategy");

class Native extends LoadingStrategy {
  async getSolc(commitString) {
    const solcFileName = this.getCachedSolcFileName(commitString);
    if (solcFileName) return this.getCachedSolcByFileName(solcFileName);

    const allVersions = await this.getSolcVersions(this.config.versionsUrl);
    const fileName = this.getVersionUrlSegment(commitString, allVersions);

    if (!fileName) throw this.errors("noVersion", version);

    const url = this.config.compilerUrlRoot + fileName;
    const spinner = ora({
      text: "Downloading compiler",
      color: "red"
    }).start();

    return this.getSolcByUrlAndCache(url, fileName, spinner);
  }

  load() {
    const versionString = this.validateAndGetSolcVersion();
    const command = "solc --standard-json";

    const commit = this.getCommitFromVersion(versionString);

    return this.getSolc(commit).then(solcjs => {
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
    } catch (error) {
      throw this.errors("noNative", null, error);
    }

    return this.normalizeSolcVersion(version);
  }
}

module.exports = Native;

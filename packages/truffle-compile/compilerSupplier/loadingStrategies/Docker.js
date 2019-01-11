const request = require("request-promise");
const fs = require("fs");
const { execSync } = require("child_process");
const LoadingStrategy = require("./LoadingStrategy");

class Docker extends LoadingStrategy {
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
    const command =
      "docker run -i ethereum/solc:" + this.config.version + " --standard-json";

    const commit = this.getCommitFromVersion(versionString);

    return this.getSolc(commit).then(solcjs => {
      return {
        compile: options => String(execSync(command, { input: options })),
        version: () => versionString,
        importsParser: solcjs
      };
    });
  }

  getDockerTags() {
    return request(this.config.dockerTagsUrl)
      .then(list => JSON.parse(list).results.map(item => item.name))
      .catch(error => {
        throw this.errors("noRequest", this.config.dockerTagsUrl, error);
      });
  }

  validateAndGetSolcVersion() {
    const image = this.config.version;
    const fileName = image + ".version";

    // Skip validation if they've validated for this image before.
    if (this.fileIsCached(fileName)) {
      const cachePath = this.resolveCache(fileName);
      return fs.readFileSync(cachePath, "utf-8");
    }

    // Image specified
    if (!image) throw this.errors("noString", image);

    // Docker exists locally
    try {
      execSync("docker -v");
    } catch (error) {
      throw this.errors("noDocker");
    }

    // Image exists locally
    try {
      execSync("docker inspect --type=image ethereum/solc:" + image);
    } catch (error) {
      throw this.errors("noImage", image);
    }

    // Get version & cache.
    const version = execSync(
      "docker run ethereum/solc:" + image + " --version"
    );
    const normalized = this.normalizeSolcVersion(version);
    this.addSolcToCache(normalized, fileName);
    return normalized;
  }
}

module.exports = Docker;

const request = require("request-promise");
const fs = require("fs");
const { execSync } = require("child_process");
const LoadingStrategy = require("./LoadingStrategy");

class Docker extends LoadingStrategy {
  load() {
    const versionString = this.validateAndGetSolcVersion();
    const command =
      "docker run -i ethereum/solc:" + this.config.version + " --standard-json";

    const commit = this.getCommitFromVersion(versionString);

    return this.getSolcForNativeOrDockerCompile(commit).then(solcjs => {
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
      .catch(err => {
        throw self.errors("noRequest", this.config.dockerTagsUrl, err);
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
    } catch (err) {
      throw this.errors("noDocker");
    }

    // Image exists locally
    try {
      execSync("docker inspect --type=image ethereum/solc:" + image);
    } catch (err) {
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

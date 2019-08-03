const request = require("request-promise");
const fs = require("fs");
const { execSync } = require("child_process");
const ora = require("ora");
const semver = require("semver");
const LoadingStrategy = require("./LoadingStrategy");
const VersionRange = require("./VersionRange");

class Docker extends LoadingStrategy {
  async load() {
    const versionString = await this.validateAndGetSolcVersion();
    const command =
      "docker run --rm -i ethereum/solc:" + this.config.version + " --standard-json";

    try {
      return {
        compile: options => String(execSync(command, { input: options })),
        version: () => versionString
      };
    } catch (error) {
      if (error.message === "No matching version found") {
        throw this.errors("noVersion", versionString);
      }
      throw new Error(error);
    }
  }

  getDockerTags() {
    return request(this.config.dockerTagsUrl)
      .then(list => JSON.parse(list).results.map(item => item.name))
      .catch(error => {
        throw this.errors("noRequest", this.config.dockerTagsUrl, error);
      });
  }

  downloadDockerImage(image) {
    if (!semver.valid(image)) {
      const message =
        `The image version you have provided is not valid.\n` +
        `Please ensure that ${image} is a valid docker image name.`;
      throw new Error(message);
    }
    const spinner = ora({
      text: "Downloading Docker image",
      color: "red"
    }).start();
    try {
      execSync(`docker pull ethereum/solc:${image}`);
      spinner.stop();
    } catch (error) {
      spinner.stop();
      throw new Error(error);
    }
  }

  async validateAndGetSolcVersion() {
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
      console.log(`${image} does not exist locally.\n`);
      console.log("Attempting to download the Docker image.");
      this.downloadDockerImage(image);
    }

    // Get version & cache.
    const version = execSync(
      "docker run ethereum/solc:" + image + " --version"
    );
    const normalized = new VersionRange().normalizeSolcVersion(version);
    this.addFileToCache(normalized, fileName);
    return normalized;
  }
}

module.exports = Docker;

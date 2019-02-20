const path = require("path");
const fs = require("fs");
const semver = require("semver");

const {
  Bundled,
  Docker,
  Local,
  Native,
  VersionRange
} = require("./loadingStrategies");

class CompilerSupplier {
  constructor(_config) {
    _config = _config || {};
    const defaultConfig = { version: null };
    this.config = Object.assign({}, defaultConfig, _config);
    this.strategyOptions = { version: this.config.version };
  }

  badInputError(userSpecification) {
    const message =
      `Could not find a compiler version matching ${userSpecification}. ` +
      `compilers.solc.version option must be a string specifying:\n` +
      `   - a path to a locally installed solcjs\n` +
      `   - a solc version or range (ex: '0.4.22' or '^0.5.0')\n` +
      `   - a docker image name (ex: 'stable')\n` +
      `   - 'native' to use natively installed solc\n`;
    return new Error(message);
  }

  load() {
    const userSpecification = this.config.version;

    return new Promise(async (resolve, reject) => {
      let strategy;
      const useDocker = this.config.docker;
      const useNative = userSpecification === "native";
      const useBundledSolc = !userSpecification;
      const useSpecifiedLocal =
        userSpecification && this.fileExists(userSpecification);
      const isValidVersionRange = semver.validRange(userSpecification);

      if (useDocker) {
        strategy = new Docker(this.strategyOptions);
      } else if (useNative) {
        strategy = new Native(this.strategyOptions);
      } else if (useBundledSolc) {
        strategy = new Bundled(this.strategyOptions);
      } else if (useSpecifiedLocal) {
        strategy = new Local(this.strategyOptions);
      } else if (isValidVersionRange) {
        strategy = new VersionRange(this.strategyOptions);
      }

      if (strategy) {
        try {
          const solc = await strategy.load(userSpecification);
          resolve(solc);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(this.badInputError(userSpecification));
      }
    });
  }

  fileExists(localPath) {
    return fs.existsSync(localPath) || path.isAbsolute(localPath);
  }

  getDockerTags() {
    return new Docker(this.strategyOptions).getDockerTags();
  }

  getReleases() {
    return new VersionRange(this.strategyOptions)
      .getSolcVersions()
      .then(list => {
        const prereleases = list.builds
          .filter(build => build["prerelease"])
          .map(build => build["longVersion"]);

        const releases = Object.keys(list.releases);

        return {
          prereleases: prereleases,
          releases: releases,
          latestRelease: list.latestRelease
        };
      });
  }
}

module.exports = CompilerSupplier;

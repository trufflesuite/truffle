const path = require("path");
const fs = require("fs");
const semver = require("semver");

const {
  Native,
  Local,
  VersionRange,
  Docker,
  Bundled
} = require("./loadingStrategies");

class CompilerSupplier {
  constructor(_config) {
    _config = _config || {};
    const defaultConfig = { version: null };
    this.config = Object.assign({}, defaultConfig, _config);
    this.strategyOptions = { version: this.config.version };
  }

  load() {
    const userSpecification = this.config.version;

    return new Promise((resolve, reject) => {
      const useDocker = this.config.docker;
      const useNative = userSpecification === "native";
      const useBundledSolc = !userSpecification;
      const useSpecifiedLocal =
        userSpecification && this.fileExists(userSpecification);
      const isValidVersionRange = semver.validRange(userSpecification);

      const options = { version: this.config.version };
      if (useDocker) return resolve(new Docker(options).load());
      if (useNative) return resolve(new Native(options).load());
      if (useBundledSolc) return resolve(new Bundled(options).load());
      if (useSpecifiedLocal)
        return resolve(new Local(options).load(userSpecification));
      if (isValidVersionRange)
        return resolve(new VersionRange(options).load(userSpecification));
      reject(this.errors("noVersion", userSpecification));
    });
  }

  fileExists(localPath) {
    return fs.existsSync(localPath) || path.isAbsolute(localPath);
  }

  getDockerTags() {
    return new Docker(this.strategyOptions).getDockerTags();
  }

  getReleases() {
    return new LoadingStrategy(this.strategyOptions)
      .getSolcVersions()
      .then(list => {
        // Prereleases
        const prereleases = list.builds
          .filter(build => build["prerelease"])
          .map(build => build["longVersion"]);

        // Releases
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

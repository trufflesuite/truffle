const fs = require("fs");
const ora = require("ora");
const semver = require("semver");
const LoadingStrategy = require("./LoadingStrategy");

class VersionRange extends LoadingStrategy {
  load(versionRange) {
    const rangeIsSingleVersion = semver.valid(versionRange);
    return rangeIsSingleVersion
      ? this.getSolcBySingleVersion(versionRange)
      : this.getSolcByVersionRange(versionRange);
  }

  // Range can also be a single version specification like "0.5.0"
  getCachedSolcByVersionRange(version) {
    const cachedCompilerFileNames = fs.readdirSync(this.cachePath);
    const validVersions = cachedCompilerFileNames.filter(fileName => {
      const match = fileName.match(/v\d+\.\d+\.\d+.*/);
      if (match) return semver.satisfies(match[0], version);
    });

    const multipleValidVersions = validVersions.length > 1;
    const compilerFileName = multipleValidVersions
      ? this.getMostRecentVersionOfCompiler(validVersions)
      : validVersions[0];
    return this.getCachedSolcByFileName(compilerFileName);
  }

  getMostRecentVersionOfCompiler(versions) {
    return versions.reduce((mostRecentVersionFileName, fileName) => {
      const match = fileName.match(/v\d+\.\d+\.\d+.*/);
      const mostRecentVersionMatch = mostRecentVersionFileName.match(
        /v\d+\.\d+\.\d+.*/
      );
      return semver.gtr(match[0], mostRecentVersionMatch[0])
        ? fileName
        : mostRecentVersionFileName;
    }, "-v0.0.0+commit");
  }

  async getFromCacheOrByUrl(version) {
    let allVersions;
    try {
      allVersions = await this.getSolcVersions(this.config.versionsUrl);
    } catch (error) {
      throw this.errors("noRequest", version, error);
    }
    const fileName = this.getVersionUrlSegment(version, allVersions);

    if (!fileName) throw this.errors("noVersion", version);

    if (this.fileIsCached(fileName))
      return this.getCachedSolcByFileName(fileName);

    const url = this.config.compilerUrlRoot + fileName;
    const spinner = ora({
      text: "Downloading compiler",
      color: "red"
    }).start();

    return this.getSolcByUrlAndCache(url, fileName, spinner);
  }

  getSatisfyingVersionFromCache(versionRange) {
    if (this.versionIsCached(versionRange)) {
      return this.getCachedSolcByVersionRange(versionRange);
    }
    throw this.errors("noVersion", versionRange);
  }

  getSolcBySingleVersion(version) {
    if (this.versionIsCached(version))
      return this.getCachedSolcByVersionRange(version);
    return this.getFromCacheOrByUrl(version);
  }

  async getSolcByVersionRange(versionRange) {
    try {
      return await this.getFromCacheOrByUrl(versionRange);
    } catch (error) {
      if (error.message.includes("Failed to complete request")) {
        return this.getSatisfyingVersionFromCache(versionRange);
      }
      throw new Error(error);
    }
  }

  versionIsCached(version) {
    const cachedCompilerFileNames = fs.readdirSync(this.cachePath);
    const cachedVersions = cachedCompilerFileNames.map(fileName => {
      const match = fileName.match(/v\d+\.\d+\.\d+.*/);
      if (match) return match[0];
    });
    return cachedVersions.find(cachedVersion =>
      semver.satisfies(cachedVersion, version)
    );
  }
}

module.exports = VersionRange;

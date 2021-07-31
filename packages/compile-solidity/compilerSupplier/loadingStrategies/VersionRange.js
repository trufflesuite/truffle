const debug = require("debug")("compile:compilerSupplier");
const requireFromString = require("require-from-string");
const originalRequire = require("original-require");
const axios = require("axios").default;
const semver = require("semver");
const solcWrap = require("solc/wrapper");
const Cache = require("../Cache");
const observeListeners = require("../observeListeners");
const { NoVersionError, NoRequestError } = require("../errors");

class VersionRange {
  constructor(options) {
    const defaultConfig = {
      compilerRoots: [
        "https://relay.trufflesuite.com/solc/bin/",
        "https://solc-bin.ethereum.org/bin/",
        "https://ethereum.github.io/solc-bin/bin/"
      ]
    };
    this.config = Object.assign({}, defaultConfig, options);

    this.cache = new Cache();
  }

  async load(versionRange) {
    const rangeIsSingleVersion = semver.valid(versionRange);
    if (rangeIsSingleVersion && this.versionIsCached(versionRange)) {
      return this.getCachedSolcByVersionRange(versionRange);
    }

    try {
      return await this.getSolcFromCacheOrUrl(versionRange);
    } catch (error) {
      if (error.message.includes("Failed to complete request")) {
        return this.getSatisfyingVersionFromCache(versionRange);
      }
      throw new Error(error);
    }
  }

  async list() {
    const data = await this.getSolcVersions();
    const { latestRelease } = data;

    const prereleases = data.builds
      .filter(build => build["prerelease"])
      .map(build => build["longVersion"]);

    // ensure releases are listed in descending order
    const releases = semver.rsort(Object.keys(data.releases));

    return {
      prereleases,
      releases,
      latestRelease
    };
  }

  compilerFromString(code) {
    const listeners = observeListeners();
    try {
      const soljson = requireFromString(code);
      return solcWrap(soljson);
    } finally {
      listeners.cleanup();
    }
  }

  findNewestValidVersion(version, allVersions) {
    if (!semver.validRange(version)) return null;
    const satisfyingVersions = Object.keys(allVersions.releases)
      .map(solcVersion => {
        if (semver.satisfies(solcVersion, version)) return solcVersion;
      })
      .filter(solcVersion => solcVersion);
    if (satisfyingVersions.length > 0) {
      return satisfyingVersions.reduce((newestVersion, version) => {
        return semver.gtr(version, newestVersion) ? version : newestVersion;
      }, "0.0.0");
    } else {
      return null;
    }
  }

  getCachedSolcByFileName(fileName) {
    const listeners = observeListeners();
    try {
      const filePath = this.cache.resolveCache(fileName);
      const soljson = originalRequire(filePath);
      debug("soljson %o", soljson);
      return solcWrap(soljson);
    } finally {
      listeners.cleanup();
    }
  }

  // Range can also be a single version specification like "0.5.0"
  getCachedSolcByVersionRange(version) {
    const cachedCompilerFileNames = this.cache.getCachedFileNames();
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

  getCachedSolcFileName(commit) {
    const cachedCompilerFileNames = this.cache.getCachedFileNames();
    return cachedCompilerFileNames.find(fileName => {
      return fileName.includes(commit);
    });
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

  getSatisfyingVersionFromCache(versionRange) {
    if (this.versionIsCached(versionRange)) {
      return this.getCachedSolcByVersionRange(versionRange);
    }
    throw new NoVersionError(versionRange);
  }

  async getSolcByCommit(commit) {
    const solcFileName = this.getCachedSolcFileName(commit);
    if (solcFileName) return this.getCachedSolcByFileName(solcFileName);

    const allVersions = await this.getSolcVersions();
    const fileName = this.getSolcVersionFileName(commit, allVersions);

    if (!fileName) throw new Error("No matching version found");
    return this.getSolcByUrlAndCache(fileName);
  }

  async getSolcByUrlAndCache(fileName, index = 0) {
    const url = `${this.config.compilerRoots[index].replace(
      /\/+$/,
      ""
    )}/${fileName}`;
    const { events } = this.config;
    events.emit("downloadCompiler:start", {
      attemptNumber: index + 1
    });
    try {
      const response = await axios.get(url, { maxRedirects: 50 });
      events.emit("downloadCompiler:succeed");
      this.cache.addFileToCache(response.data, fileName);
      return this.compilerFromString(response.data);
    } catch (error) {
      events.emit("downloadCompiler:fail");
      if (index >= this.config.compilerRoots.length - 1) {
        throw new NoRequestError("compiler URLs", error);
      }
      return this.getSolcByUrlAndCache(fileName, index + 1);
    }
  }

  async getSolcFromCacheOrUrl(versionConstraint) {
    let allVersions, versionToUse;
    try {
      allVersions = await this.getSolcVersions();
    } catch (error) {
      throw new NoRequestError(versionConstraint, error);
    }
    const isVersionRange = !semver.valid(versionConstraint);

    versionToUse = isVersionRange
      ? this.findNewestValidVersion(versionConstraint, allVersions)
      : versionConstraint;
    const fileName = this.getSolcVersionFileName(versionToUse, allVersions);

    if (!fileName) throw new NoVersionError(versionToUse);

    if (this.cache.fileIsCached(fileName))
      return this.getCachedSolcByFileName(fileName);
    return this.getSolcByUrlAndCache(fileName);
  }

  getSolcVersions(index = 0) {
    const { events } = this.config;
    events.emit("fetchSolcList:start", { attemptNumber: index + 1 });
    if (!this.config.compilerRoots || this.config.compilerRoots.length < 1) {
      events.emit("fetchSolcList:fail");
      throw new NoUrlError();
    }
    const { compilerRoots } = this.config;

    // trim trailing slashes from compilerRoot
    const url = `${compilerRoots[index].replace(/\/+$/, "")}/list.json`;
    return axios
      .get(url, { maxRedirects: 50 })
      .then(response => {
        events.emit("fetchSolcList:succeed");
        return response.data;
      })
      .catch(error => {
        events.emit("fetchSolcList:fail");
        if (index >= this.config.compilerRoots.length - 1) {
          throw new NoRequestError("version URLs", error);
        }
        return this.getSolcVersions(index + 1);
      });
  }

  getSolcVersionFileName(version, allVersions) {
    if (allVersions.releases[version]) return allVersions.releases[version];

    const isPrerelease =
      version.includes("nightly") || version.includes("commit");

    if (isPrerelease) {
      for (let build of allVersions.builds) {
        const exists =
          build["prerelease"] === version ||
          build["build"] === version ||
          build["longVersion"] === version;

        if (exists) return build["path"];
      }
    }

    const versionToUse = this.findNewestValidVersion(version, allVersions);

    if (versionToUse) return allVersions.releases[versionToUse];

    return null;
  }

  versionIsCached(version) {
    const cachedCompilerFileNames = this.cache.getCachedFileNames();
    const cachedVersions = cachedCompilerFileNames.map(fileName => {
      const match = fileName.match(/v\d+\.\d+\.\d+.*/);
      if (match) return match[0];
    });
    return cachedVersions.find(cachedVersion =>
      semver.satisfies(cachedVersion, version)
    );
  }
}

class NoUrlError extends Error {
  constructor() {
    super("compiler root URL missing");
  }
}


module.exports = VersionRange;

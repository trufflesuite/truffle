const requireFromString = require("require-from-string");
const debug = require("debug")("compile:compilerSupplier");
const solcWrap = require("solc/wrapper");
const findCacheDir = require("find-cache-dir");
const originalRequire = require("original-require");
const ora = require("ora");
const request = require("request-promise");
const fs = require("fs");
const semver = require("semver");

class LoadingStrategy {
  constructor(options) {
    const defaultConfig = {
      versionsUrl: "https://solc-bin.ethereum.org/bin/list.json",
      compilerUrlRoot: "https://solc-bin.ethereum.org/bin/",
      dockerTagsUrl:
        "https://registry.hub.docker.com/v2/repositories/ethereum/solc/tags/",
      cache: true
    };
    this.config = Object.assign({}, defaultConfig, options);
    this.cachePath = findCacheDir({
      name: "truffle",
      cwd: __dirname,
      create: true
    });
  }

  addSolcToCache(code, fileName) {
    if (!this.config.cache) return;

    const filePath = this.resolveCache(fileName);
    fs.writeFileSync(filePath, code);
  }

  compilerFromString(code) {
    const soljson = requireFromString(code);
    const wrapped = solcWrap(soljson);
    this.removeListener();
    return wrapped;
  }

  errors(kind, input, error) {
    const info = "Run `truffle compile --list` to see available versions.";

    const kinds = {
      noPath: "Could not find compiler at: " + input,
      noVersion:
        `Could not find a compiler version matching ${input}. ` +
        `Please ensure you are specifying a valid version, constraint or ` +
        `build in the truffle config. ${info}`,
      noRequest:
        "Failed to complete request to: " +
        input +
        ". Are you connected to the internet?\n\n" +
        error,
      noDocker:
        "You are trying to run dockerized solc, but docker is not installed.",
      noImage:
        "Please pull " +
        input +
        " from docker before trying to compile with it.",
      noNative: "Could not execute local solc binary: " + error,
      noString:
        "`compilers.solc.version` option must be a string specifying:\n" +
        "   - a path to a locally installed solcjs\n" +
        "   - a solc version or range (ex: '0.4.22' or '^0.5.0')\n" +
        "   - a docker image name (ex: 'stable')\n" +
        "   - 'native' to use natively installed solc\n" +
        "Received: " +
        input +
        " instead."
    };

    return new Error(kinds[kind]);
  }

  fileIsCached(fileName) {
    const file = this.resolveCache(fileName);
    return fs.existsSync(file);
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
    const filePath = this.resolveCache(fileName);
    const soljson = originalRequire(filePath);
    debug("soljson %o", soljson);
    const wrapped = solcWrap(soljson);
    this.removeListener();
    return wrapped;
  }

  getCachedSolcFileName(commitString) {
    const cachedCompilerFileNames = fs.readdirSync(this.cachePath);
    return cachedCompilerFileNames.find(fileName => {
      return fileName.includes(commitString);
    });
  }

  getCommitFromVersion(versionString) {
    return "commit." + versionString.match(/commit\.(.*?)\./)[1];
  }

  async getSolcByUrlAndCache(url, fileName, spinner) {
    try {
      const response = await request.get(url);
      if (spinner) spinner.stop();
      this.addSolcToCache(response, fileName);
      return this.compilerFromString(response);
    } catch (error) {
      if (spinner) spinner.stop();
      throw this.errors("noRequest", url, error);
    }
  }

  getSolcVersions() {
    const spinner = ora({
      text: "Fetching solc version list from solc-bin",
      color: "yellow"
    }).start();

    return request(this.config.versionsUrl)
      .then(list => {
        spinner.stop();
        return JSON.parse(list);
      })
      .catch(err => {
        spinner.stop();
        throw this.errors("noRequest", this.config.versionsUrl, err);
      });
  }

  /**
   * Returns terminal url segment for `version` from the versions object
   * generated  by `getSolcVersions`.
   * @param  {String} version         ex: "0.4.1", "0.4.16-nightly.2017.8.9+commit.81887bc7"
   * @param  {Object} allVersions     (see `getSolcVersions`)
   * @return {String} url             ex: "soljson-v0.4.21+commit.dfe3193c.js"
   */
  getVersionUrlSegment(version, allVersions) {
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

  normalizeSolcVersion(version) {
    version = String(version);
    return version.split(":")[1].trim();
  }

  /**
   * Cleans up error listeners set (by solc?) when requiring it. (This code inherited from
   * previous implementation, note to self - ask Tim about this)
   */
  removeListener() {
    const listeners = process.listeners("uncaughtException");
    const execeptionHandler = listeners[listeners.length - 1];

    if (execeptionHandler) {
      process.removeListener("uncaughtException", execeptionHandler);
    }
  }

  resolveCache(fileName) {
    const thunk = findCacheDir({
      name: "truffle",
      cwd: __dirname,
      thunk: true
    });
    return thunk(fileName);
  }
}

module.exports = LoadingStrategy;

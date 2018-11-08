const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const request = require("request-promise");
const requireFromString = require("require-from-string");
const findCacheDir = require("find-cache-dir");
const originalRequire = require("original-require");
const solcWrap = require("./solcWrap.js");
const ora = require("ora");
const semver = require("semver");

//------------------------------ Constructor/Config ------------------------------------------------

/**
 * Constructor:
 * @param {Object} _config (see `supplier.config`)
 */
function CompilerSupplier(_config) {
  _config = _config || {};
  this.config = Object.assign({}, defaultConfig, _config);
}

const defaultConfig = {
  version: null,
  versionsUrl: "https://solc-bin.ethereum.org/bin/list.json",
  compilerUrlRoot: "https://solc-bin.ethereum.org/bin/",
  dockerTagsUrl:
    "https://registry.hub.docker.com/v2/repositories/ethereum/solc/tags/",
  cache: true
};

CompilerSupplier.prototype.cachePath = findCacheDir({
  name: "truffle",
  cwd: __dirname,
  create: true
});

//----------------------------------- Interface  ---------------------------------------------------

/**
 * Load solcjs from four possible locations:
 * - local node_modules            (config.version = <undefined>)
 * - absolute path to a local solc (config.version = <path>)
 * - a solc cache                  (config.version = <version-string> && cache contains version)
 * - a remote solc-bin source      (config.version = <version-string> && version not cached)
 *
 * OR specify that solc.compileStandard should wrap:
 * - dockerized solc               (config.version = "<image-name>" && config.docker: true)
 * - native built solc             (cofing.version = "native")
 *
 * @return {Module|Object}         solc
 */
CompilerSupplier.prototype.load = function() {
  const self = this;
  const version = self.config.version;
  const isNative = self.config.version === "native";

  return new Promise(accept => {
    const useDocker = self.config.docker;
    const useDefault = !version;
    const useLocal = !useDefault && self.isLocal(version);
    const useCached = !useDefault && self.versionIsCached(version);
    const useNative = !useLocal && isNative;
    const useRemote = !useNative;

    if (useDocker) return accept(self.getBuilt("docker"));
    if (useNative) return accept(self.getBuilt("native"));
    if (useDefault) return accept(self.getDefault());
    if (useLocal) return accept(self.getLocal(version));
    if (useCached) return accept(self.getCached(version));
    if (useRemote) return accept(self.getByUrl(version)); // Tries cache first, then remote.
  });
};

/**
 * Returns keys that can be used to specify which remote solc to fetch
 * ```
 *   latestRelease:  "0.4.21",
 *   releases: ["0.4.21", ...],
 *   prereleases: ["0.4.22-nightly.2018.4.10+commit.27385d6d", ...]
 * ```
 * @return {Object} See above
 */
CompilerSupplier.prototype.getReleases = function() {
  return this.getVersions().then(list => {
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
};

/**
 * Fetches the first page of docker tags for the the ethereum/solc image
 * @return {Object} tags
 */
CompilerSupplier.prototype.getDockerTags = function() {
  const self = this;

  return request(self.config.dockerTagsUrl)
    .then(list => JSON.parse(list).results.map(item => item.name))
    .catch(err => {
      throw self.errors("noRequest", self.config.dockerTagsUrl, err);
    });
};

//------------------------------------ Getters -----------------------------------------------------

/**
 * Gets solc from `node_modules`.`
 * @return {Module} solc
 */
CompilerSupplier.prototype.getDefault = function() {
  const compiler = require("solc");
  this.removeListener();
  return compiler;
};

/**
 * Gets a cached solc from specified version.
 * @param  {String} version
 * @return {Module}
 */
CompilerSupplier.prototype.getCached = function(version) {
  const cachedCompilerFileNames = fs.readdirSync(this.cachePath);
  const validVersions = cachedCompilerFileNames.filter(fileName => {
    const match = fileName.match(/v\d+\.\d+\.\d+.*/);
    if (match) return semver.satisfies(match[0], version);
  });

  const multipleValidVersions = validVersions.length > 1;
  const compilerFileName = multipleValidVersions
    ? getMostRecentVersionOfCompiler(validVersions)
    : validVersions[0];
  return this.getFromCache(compilerFileName);
};

const getMostRecentVersionOfCompiler = versions => {
  return versions.reduce((mostRecentVersionFileName, fileName) => {
    const match = fileName.match(/v\d+\.\d+\.\d+.*/);
    const mostRecentVersionMatch = mostRecentVersionFileName.match(
      /v\d+\.\d+\.\d+.*/
    );
    if (semver.gtr(match[0], mostRecentVersionMatch[0])) return fileName;
  }, "-v0.0.0+commit");
};

/**
 * Gets an npm installed solc from specified path.
 * @param  {String} localPath
 * @return {Module}
 */
CompilerSupplier.prototype.getLocal = function(localPath) {
  const self = this;
  let compiler;

  if (!path.isAbsolute(localPath)) {
    localPath = path.resolve(process.cwd(), localPath);
  }

  try {
    compiler = originalRequire(localPath);
    self.removeListener();
  } catch (err) {
    throw self.errors("noPath", localPath);
  }

  return compiler;
};

/**
 * Fetches solc versions object from remote solc-bin. This includes an array of build
 * objects with detailed version info, an array of release version numbers
 * and their terminal url segment strings, and a latest version key with the
 * same.
 * @return {Object} versions
 */
CompilerSupplier.prototype.getVersions = function() {
  const self = this;
  const spinner = ora({
    text: "Fetching solc version list from solc-bin",
    color: "yellow"
  }).start();

  return request(self.config.versionsUrl)
    .then(list => {
      spinner.stop();
      return JSON.parse(list);
    })
    .catch(err => {
      spinner.stop();
      throw self.errors("noRequest", self.config.versionsUrl, err);
    });
};

/**
 * Returns terminal url segment for `version` from the versions object
 * generated  by `getVersions`.
 * @param  {String} version         ex: "0.4.1", "0.4.16-nightly.2017.8.9+commit.81887bc7"
 * @param  {Object} allVersions     (see `getVersions`)
 * @return {String} url             ex: "soljson-v0.4.21+commit.dfe3193c.js"
 */
CompilerSupplier.prototype.getVersionUrlSegment = function(
  version,
  allVersions
) {
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

  return null;
};

/**
 * Downloads solc specified by `version` after attempting retrieve it from cache on local machine,
 * @param  {String} version ex: "0.4.1", "0.4.16-nightly.2017.8.9+commit.81887bc7"
 * @return {Module}         solc
 */
CompilerSupplier.prototype.getByUrl = function(version) {
  const self = this;

  return self.getVersions(self.config.versionsUrl).then(allVersions => {
    const file = self.getVersionUrlSegment(version, allVersions);

    if (!file) throw self.errors("noVersion", version);

    if (self.isCached(file)) return self.getFromCache(file);

    const url = self.config.compilerUrlRoot + file;
    const spinner = ora({
      text: "Downloading compiler",
      color: "red"
    }).start();

    return request
      .get(url)
      .then(response => {
        spinner.stop();
        self.addToCache(response, file);
        return self.compilerFromString(response);
      })
      .catch(err => {
        spinner.stop();
        throw self.errors("noRequest", url, err);
      });
  });
};

/**
 * Makes solc.compileStandard a wrapper to a child process invocation of dockerized solc
 * or natively build solc. Also fetches a companion solcjs for the built js to parse imports
 * @return {Object} solc output
 */
CompilerSupplier.prototype.getBuilt = function(buildType) {
  let versionString;
  let command;

  switch (buildType) {
    case "native":
      versionString = this.validateNative();
      command = "solc --standard-json";
      break;
    case "docker":
      versionString = this.validateDocker();
      command =
        "docker run -i ethereum/solc:" +
        this.config.version +
        " --standard-json";
      break;
  }

  const commit = this.getCommitFromVersion(versionString);

  return this.getByUrl(commit).then(solcjs => {
    return {
      compileStandard: options => String(execSync(command, { input: options })),
      version: () => versionString,
      importsParser: solcjs
    };
  });
};

//------------------------------------ Utils -------------------------------------------------------

/**
 * Returns true if file exists or `localPath` is an absolute path.
 * @param  {String}  localPath
 * @return {Boolean}
 */
CompilerSupplier.prototype.isLocal = function(localPath) {
  return fs.existsSync(localPath) || path.isAbsolute(localPath);
};

/**
 * Returns a valid version name if compiler file is cached
 * @param  {String}  version
 * @return {Boolean}
 */
CompilerSupplier.prototype.versionIsCached = function(version) {
  const cachedCompilerFileNames = fs.readdirSync(this.cachePath);
  const cachedVersions = cachedCompilerFileNames.map(fileName => {
    const match = fileName.match(/v\d+\.\d+\.\d+.*/);
    if (match) return match[0];
  });
  return cachedVersions.find(cachedVersion =>
    semver.satisfies(cachedVersion, version)
  );
};

/**
 * Checks to make sure image is specified in the config, that docker exists and that
 * the image exists locally. If the last condition isn't true, docker will try to pull
 * it down and this breaks everything.
 * @return {String}  solc version string
 * @throws {Error}
 */
CompilerSupplier.prototype.validateDocker = function() {
  const image = this.config.version;
  const fileName = image + ".version";

  // Skip validation if they've validated for this image before.
  if (this.isCached(fileName)) {
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
  const version = execSync("docker run ethereum/solc:" + image + " --version");
  const normalized = this.normalizeVersion(version);
  this.addToCache(normalized, fileName);
  return normalized;
};

/**
 * Checks to make sure image is specified in the config, that docker exists and that
 * the image exists locally. If the last condition isn't true, docker will try to pull
 * it down and this breaks everything.
 * @return {String}  solc version string
 * @throws {Error}
 */
CompilerSupplier.prototype.validateNative = function() {
  let version;
  try {
    version = execSync("solc --version");
  } catch (err) {
    throw this.errors("noNative", null, err);
  }

  return this.normalizeVersion(version);
};

/**
 * Extracts a commit key from the version info returned by native/docker solc.
 * We use this to fetch a companion solcjs from solc-bin in order to parse imports
 * correctly.
 * @param  {String} versionString   version info from ex: `solc -v`
 * @return {String}                 commit key, ex: commit.4cb486ee
 */
CompilerSupplier.prototype.getCommitFromVersion = function(versionString) {
  return "commit." + versionString.match(/commit\.(.*?)\./)[1];
};

/**
 * Converts shell exec'd solc version from buffer to string and strips out human readable
 * description.
 * @param  {Buffer} version result of childprocess
 * @return {String}         normalized version string: e.g 0.4.22+commit.4cb486ee.Linux.g++
 */
CompilerSupplier.prototype.normalizeVersion = function(version) {
  version = String(version);
  return version.split(":")[1].trim();
};

/**
 * Returns path to cached solc version
 * @param  {String} fileName ex: "soljson-v0.4.21+commit.dfe3193c.js"
 * @return {String}          path
 */
CompilerSupplier.prototype.resolveCache = function(fileName) {
  const thunk = findCacheDir({ name: "truffle", cwd: __dirname, thunk: true });
  return thunk(fileName);
};

/**
 * Returns true if `fileName` exists in the cache.
 * @param  {String}  fileName   ex: "soljson-v0.4.21+commit.dfe3193c.js"
 * @return {Boolean}
 */
CompilerSupplier.prototype.isCached = function(fileName) {
  const file = this.resolveCache(fileName);
  return fs.existsSync(file);
};

/**
 * Write  to the cache at `config.cachePath`. Creates `cachePath` directory if
 * does not exist.
 * @param {String} code       JS code string downloaded from solc-bin
 * @param {String} fileName   ex: "soljson-v0.4.21+commit.dfe3193c.js"
 */
CompilerSupplier.prototype.addToCache = function(code, fileName) {
  if (!this.config.cache) return;

  const filePath = this.resolveCache(fileName);
  fs.writeFileSync(filePath, code);
};

/**
 * Retrieves usable solc module from cache
 * @param  {String} file  ex: "soljson-v0.4.21+commit.dfe3193c.js"
 * @return {Module}       solc
 */
CompilerSupplier.prototype.getFromCache = function(fileName) {
  const filePath = this.resolveCache(fileName);
  const soljson = originalRequire(filePath);
  const wrapped = solcWrap(soljson);
  this.removeListener();
  return wrapped;
};

/**
 * Converts the JS code string obtained from solc-bin to usable node module.
 * @param  {String} code JS code
 * @return {Module}      solc
 */
CompilerSupplier.prototype.compilerFromString = function(code) {
  const soljson = requireFromString(code);
  const wrapped = solcWrap(soljson);
  this.removeListener();
  return wrapped;
};

/**
 * Cleans up error listeners set (by solc?) when requiring it. (This code inherited from
 * previous implementation, note to self - ask Tim about this)
 */
CompilerSupplier.prototype.removeListener = function() {
  const listeners = process.listeners("uncaughtException");
  const execeptionHandler = listeners[listeners.length - 1];

  if (execeptionHandler) {
    process.removeListener("uncaughtException", execeptionHandler);
  }
};

/**
 * Error formatter
 * @param  {String} kind  descriptive key
 * @param  {String} input contextual info for error
 * @param  {Object} err   [optional] additional error associated with this error
 * @return {Error}
 */
CompilerSupplier.prototype.errors = function(kind, input, err) {
  const info = "Run `truffle compile --list` to see available versions.";

  const kinds = {
    noPath: "Could not find compiler at: " + input,
    noVersion: "Could not find compiler version:\n" + input + ".\n" + info,
    noRequest:
      "Failed to complete request to: " +
      input +
      ". Are you connected to the internet?\n\n" +
      err,
    noDocker:
      "You are trying to run dockerized solc, but docker is not installed.",
    noImage:
      "Please pull " + input + " from docker before trying to compile with it.",
    noNative: "Could not execute local solc binary: " + err,

    // Lists
    noString:
      "`compilers.solc.version` option must be a string specifying:\n" +
      "   - a path to a locally installed solcjs\n" +
      "   - a solc version (ex: '0.4.22')\n" +
      "   - a docker image name (ex: 'stable')\n" +
      "Received: " +
      input +
      " instead."
  };

  return new Error(kinds[kind]);
};

module.exports = CompilerSupplier;

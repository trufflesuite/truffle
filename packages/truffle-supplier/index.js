const child = require('child_process');
const expect = require("truffle-expect");
const findCacheDir = require('find-cache-dir');
const fs = require('fs');
const originalRequire = require("original-require");
const path = require('path');
const request = require('request-promise');
const requireFromString = require('require-from-string');
const debug = require("debug")("supplier");


//------------------------------ Constructor/Config ------------------------------------------------

/**
 * Constructor
 */
function Supplier(_config) {
  _config = _config || {};
  this.config = Object.assign(this.config, this.baseConfig, _config);

  // must be provided via defaults or specified via end-user override
  expect.options(this.config, [
    "componentName",
    "versionsUrl",
    "urlRoot",
    "dockerTagsUrl",
    "dockerImageName",
    "packageName",
    "commandBin",
    "commandArgs"
  ]);
}

Supplier.prototype.baseConfig = {
  version: null,
  cache: true
};

// The path to the cache root depends on whether or not we're running in the
// bundled version.
if (typeof BUNDLE_CHAIN_FILENAME != "undefined") {
  // Remember: In the bundled version, __dirname refers to the
  // build directory where cli.bundled.js lives
  Supplier.prototype.cacheRoot = path.join(__dirname, "..");
} else {
  // Otherwise, this file is inside truffle-supplier, so let's get back to
  // truffle
  Supplier.prototype.cacheRoot = path.join(__dirname, "..", "truffle");
}

debug("cache root: %s", Supplier.prototype.cacheRoot);


//----------------------------------- Interface  ---------------------------------------------------

/**
 * Loads a JS module component from four possible locations:
 * - local node_modules            (config.version = <undefined>)
 * - absolute path to a local      (config.version = <path>)
 * - the cache                     (config.version = <version-string> && cache contains version)
 * - a remote source               (config.version = <version-string> && version not cached)
 *
 * OR specify that a wrapper should wrap an external program:
 * - Docker image                  (config.version = "<image-name>" && config.docker: true)
 * - shell-default binary          (cofing.version = "native")
 *
 * @return {Module|Object}         supplied component
 */
Supplier.prototype.load = function(){
  const self = this;
  const version = self.config.version;
  const isNative = version === 'native';

  return new Promise((accept, reject) => {
    const useDocker =  self.config.docker;
    const useDefault = !version;
    const useLocal =   !useDefault && self.isLocal(version);
    const useNative =  !useLocal && isNative;
    const useRemote =  !useNative

    if (useDocker)  {
      debug("using docker");
      return accept(self.getBuilt("docker"));
    }

    if (useNative) {
      debug("using native");
      return accept(self.getBuilt("native"));
    }

    if (useDefault) {
      debug("using default");
      return accept(self.getDefault());
    }

    if (useLocal) {
      debug("using local");
      return accept(self.getLocal(version));
    }

    if (useRemote) {
      debug("using remote");
      return accept(self.getByUrl(version)); // Tries cache first, then remote.
    }
  });
}

/**
 * Returns keys that can be used to specify which remote version to fetch
 * ```
 *   latestRelease:  "0.4.21",
 *   releases: ["0.4.21", ...],
 *   prereleases: ["0.4.22-nightly.2018.4.10+commit.27385d6d", ...]
 * ```
 * @abstract
 * @return {Object} See above
 */
Supplier.prototype.getReleases = function(){
  throw new Error(
    "Attempted to invoke abstract method Supplier.prototype.getReleases()"
  );
}

/**
 * Fetches the first page of docker tags for the component's image
 * @return {Object} tags
 */
Supplier.prototype.getDockerTags = function(){
  const self = this;

  return request(self.config.dockerTagsUrl)
    .then(list =>
      JSON
        .parse(list)
        .results
        .map(item => item.name)
    )
    .catch(err => {throw self.errors('noRequest', url, err)});
}


//------------------------------------ Getters -----------------------------------------------------

/**
 * Gets local version from `node_modules`.`
 * @return {Module} Component
 */
Supplier.prototype.getDefault = function(){
  return require(this.config.packageName);
}

/**
 * Gets an npm installed component from specified path.
 * @param  {String} localPath
 * @return {Module}
 */
Supplier.prototype.getLocal = function(localPath){
  const self = this;
  let component;

  try {
    component = originalRequire(localPath)
  } catch (err) {
    throw self.errors('noPath', localPath);
  }

  return component;
}


/**
 * Fetches component versions object from remote URL. This includes an array of
 * buildobjects with detailed version info, an array of release version numbers
 * and their terminal url segment strings, and a latest version key with the
 * same.
 * @return {Object} versions
 */
Supplier.prototype.getVersions = function(){
  const self = this;

  return request(self.config.versionsUrl)
    .then(list => JSON.parse(list))
    .catch(err => {throw self.errors('noRequest', url, err)});
}


/**
 * Returns terminal url segment for `version` from the versions object
 * generated  by `getVersions`.
 * @param  {String} version         ex: "0.4.1", "0.4.16-nightly.2017.8.9+commit.81887bc7"
 * @param  {Object} allVersions     (see `getVersions`)
 * @return {String} url             ex: "soljson-v0.4.21+commit.dfe3193c.js"
 */
Supplier.prototype.getVersionUrlSegment = function(version, allVersions){
  throw new Error("Attempted to call abstract method Supplier.prototype.formatVersionURL");
}

/**
 * Downloads component specified by `version` after attempting retrieve it from cache on local machine,
 * @param  {String} version ex: "0.4.1", "0.4.16-nightly.2017.8.9+commit.81887bc7"
 * @return {Module}         solc
 */
Supplier.prototype.getByUrl = function(version){
  const self = this;

  return self
    .getVersions(self.config.versionsUrl)
    .then(allVersions => {
      const file = self.getVersionUrlSegment(version, allVersions);

      if (!file)               throw self.errors('noVersion', version);

      if (self.isCached(file)) return self.getFromCache(file);

      const url = self.config.urlRoot + file;

      return request
        .get(url)
        .then(response => {
          self.addToCache(response, file);
          return self.componentFromString(response);
        })
        .catch(err => { throw self.errors('noRequest', url, err)});
    });
}

/**
 * Returns a default JS wrapper for a component. Should be overridden to match
 * concrete component class JS interface (e.g. define `compileStandard`
 * for native `solc`)
 * @param {String} command - command to run
 * @param {String} version - raw version string
 * @return {Promise<Object>} - promise for wrapped component
 */
Supplier.prototype.getCommandWrapper = function (command, version) {
  return Promise.resolve({
    execute: (options) => String(child.execSync(command, {input: options})),
    version: () => version
  });
}

/**
 * Returns a JS interface wrapping a child process invocation of dockerized or
 * natively available command.
 * @return {Promise<Object>} promise for a wrapped JS component
 */
Supplier.prototype.getBuilt = function(buildType){
  let version;
  let command;

  switch (buildType) {
    case "native":
      version = this.validateNative();
      command = `${this.config.commandBin} ${this.config.commandArgs}`;
      break;
    case "docker":
      version = this.validateDocker();
      command = `docker run -i ${this.config.dockerImageName}:${this.config.version} ${this.config.commandArgs}`;
      break;
  }

  return this.getCommandWrapper(command, version);
}

//------------------------------------ Utils -------------------------------------------------------

/**
 * Returns true if file exists or `localPath` is an absolute path.
 * @param  {String}  localPath
 * @return {Boolean}
 */
Supplier.prototype.isLocal = function(localPath){
  return fs.existsSync(localPath) || path.isAbsolute(localPath);
}

/**
 * Checks to make sure image is specified in the config, that docker exists and that
 * the image exists locally. If the last condition isn't true, docker will try to pull
 * it down and this breaks everything.
 * @return {String}  solc version string
 * @throws {Error}
 */
Supplier.prototype.validateDocker = function(){
  const image = this.config.version;
  const fileName = image + '.version';

  // Skip validation if they've validated for this image before.
  if (this.isCached(fileName)){
    const cachePath = this.resolveCache(fileName);
    return fs.readFileSync(cachePath, 'utf-8');
  }

  // Image specified
  if (!image) throw this.errors('noString', image);

  // Docker exists locally
  try {
    child.execSync('docker -v');
  } catch(err){
    throw this.errors('noDocker');
  }

  // Image exists locally
  try {
    child.execSync(
      `docker inspect --type=image ${this.config.dockerImageName}:${image}`
    );
  } catch(err){
    debug("err %O", err)
    throw this.errors('noImage', image);
  }

  // Get version & cache.
  const version = child.execSync(
    `docker run ${this.config.dockerImageName}:${image} --version`
  );
  const normalized = this.normalizeVersion(version);
  this.addToCache(normalized, fileName);
  return normalized;
}

/**
 * Checks to make sure image is specified in the config, that docker exists and that
 * the image exists locally. If the last condition isn't true, docker will try to pull
 * it down and this breaks everything.
 * @return {String}  solc version string
 * @throws {Error}
 */
Supplier.prototype.validateNative = function(){
  let version;
  try {
    version = child.execSync(`${this.config.commandBin} --version`);
  } catch(err){
    throw this.errors('noNative', null, err);
  }

  return this.normalizeVersion(version);
}

/**
 * Converts shell exec'd component version from buffer to string and strips out
 * human readable description.
 * @param  {Buffer} version result of childprocess
 * @return {String}         normalized version string: e.g 0.4.22+commit.4cb486ee.Linux.g++
 */
Supplier.prototype.normalizeVersion = function(version){
  version = String(version);
  return version.split(':')[1].trim();
}


/**
 * Returns path to cached component version
 * @param  {String} fileName ex: "soljson-v0.4.21+commit.dfe3193c.js"
 * @return {String}          path
 */
Supplier.prototype.resolveCache = function(fileName){
  const thunk = findCacheDir({
    name: 'truffle',
    cwd: Supplier.prototype.cacheRoot,
    thunk: true
  });
  return thunk(fileName);
}

/**
 * Returns true if `fileName` exists in the cache.
 * @param  {String}  fileName   ex: "soljson-v0.4.21+commit.dfe3193c.js"
 * @return {Boolean}
 */
Supplier.prototype.isCached = function(fileName){
  const file = this.resolveCache(fileName);
  return fs.existsSync(file);
}

/**
 * Write  to the cache at `config.cachePath`. Creates `cachePath` directory if
 * does not exist.
 * @param {String} code       JS code string downloaded from solc-bin
 * @param {String} fileName   ex: "soljson-v0.4.21+commit.dfe3193c.js"
 */
Supplier.prototype.addToCache = function(code, fileName){
  if (!this.config.cache) return;

  const filePath = this.resolveCache(fileName);
  fs.writeFileSync(filePath, code);
}

/**
 * Returns a default wrapper for JS module component. Override for performance
 * or interface reasons.
 *
 * @param {Module} underlying module
 * @param {String} version - raw version string
 * @return {Promise<Object>} - promise for wrapped component
 */
Supplier.prototype.getModuleWrapper = function (module, version) {
  return Promise.resolve({
    execute: (options) => module.call(null, options),
    version: () => version
  });
}
/**
 * Retrieves usable solc module from cache
 * @param  {String} file  ex: "soljson-v0.4.21+commit.dfe3193c.js"
 * @return {Module}       solc
 */
Supplier.prototype.getFromCache = function(fileName){
  const filePath = this.resolveCache(fileName);
  const loaded = originalRequire(filePath);
  return this.getModuleWrapper(loaded);
}

/**
 * Converts the JS code string obtained from solc-bin to usable node module.
 * @param  {String} code JS code
 * @return {Module}      solc
 */
Supplier.prototype.componentFromString = function(code){
  const loaded = requireFromString(code);
  return this.getModuleWrapper(loaded);
}

/**
 * Error formatter
 * @param  {String} kind  descriptive key
 * @param  {String} input contextual info for error
 * @param  {Object} err   [optional] additional error associated with this error
 * @return {Error}
 */
Supplier.prototype.errors = function(kind, input, err){
  const component = this.config.componentName;

  const kinds = {

    noPath:    `Could not find ${component} at: ${input}`,
    noVersion: `Could not find ${component} version:\n${input}.`,
    noRequest: `Failed to complete request to: ${input}.\n\n${err}`,
    noDocker:  `You are trying to run dockerized version of ${component}, but docker is not installed.`,
    noImage:   `Please pull ${input} from docker before trying to compile with it.`,
    noNative:  `Could not execute local ${component} binary: ${err}`,

    // Lists
    noString:  `Invalid version specified. Received: ${input}`
  }

  return new Error(kinds[kind]);
}

module.exports = Supplier;

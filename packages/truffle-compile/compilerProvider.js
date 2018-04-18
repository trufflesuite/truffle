const path = require('path');
const fs = require('fs');
const child = require('child_process');
const request = require('request-promise');
const requireFromString = require('require-from-string');
const findCacheDir = require('find-cache-dir');
const originalRequire = require('original-require');


//------------------------------ Constructor/Config ------------------------------------------------

/**
 * Constructor:
 * @param {Object} _config (see `provider.config`)
 */
function CompilerProvider(_config){
  _config = _config || {};
  this.config = Object.assign(this.config, _config);
}

/**
 * Default configuration
 * @type {Object}
 */
CompilerProvider.prototype.config = {
  solc: null,
  versionsUrl: 'https://solc-bin.ethereum.org/bin/list.json',
  compilerUrlRoot: 'https://solc-bin.ethereum.org/bin/',
  cache: true,
}


CompilerProvider.prototype.cachePath = findCacheDir({
  name: 'truffle',
  cwd: __dirname,
  create: true,
})

//----------------------------------- Interface  ---------------------------------------------------

/**
 * Load solcjs from four possible locations:
 * - local node_modules            (config.solc = <undefined>)
 * - absolute path to a local solc (config.solc = <path>)
 * - a solc cache                  (config.solc = <version-string> && cache contains version)
 * - a remote solc-bin source      (config.solc = <version-string> && version not cached)
 *
 * OR specify that solc.compileStandard should wrap:
 * - dockerized solc               (config.solc = "<image-name>" && config.docker: true)
 *
 * @return {Module|Object}         solc
 */
CompilerProvider.prototype.load = function(){
  const self = this;
  const solc = self.config.solc;
  const isNative = self.config.solc === 'native';

  return new Promise((accept, reject) => {
    const useDocker =  self.config.docker;
    const useDefault = !solc;
    const useLocal =   !useDefault && self.isLocal(solc);
    const useNative =  !useLocal && isNative;
    const useRemote =  !useNative

    if (useDocker)  return accept(self.getDocker());
    if (useDefault) return accept(self.getDefault());
    if (useLocal)   return accept(self.getLocal(solc));
    if (useNative)  return accept(self.getNative(solc));
    if (useRemote)  return accept(self.getByUrl(solc)); // Tries cache first, then remote.
  });
}

/**
 * Returns keys that can be used to specify which remote solc to fetch
 * ```
 *   latestRelease:  "0.4.21",
 *   releases: ["0.4.21", ...],
 *   prereleases: ["0.4.22-nightly.2018.4.10+commit.27385d6d", ...]
 * ```
 * @return {Object} See above
 */
CompilerProvider.prototype.getReleases = function(){
  return this
    .getVersions()
    .then(list => {

      // Prereleases
      const prereleases = list
          .builds
          .filter(build => build['prerelease'])
          .map(build => build['longVersion']);

      // Releases
      const releases = Object.keys(list.releases);

      return {
        prereleases: prereleases,
        releases: releases,
        latestRelease: list.latestRelease,
      }
    });
}

//------------------------------------ Getters -----------------------------------------------------

/**
 * Gets solc from local `node_modules`. Equivalent to `require("solc")`
 * @return {Module} solc
 */
CompilerProvider.prototype.getDefault = function(){
  const compiler = require('solc');
  this.removeListener();
  return compiler;
}

/**
 * Gets an npm installed solc from specified absolute path.
 * @param  {String} localPath
 * @return {Module}
 */
CompilerProvider.prototype.getLocal = function(localPath){
  const self = this;
  let compiler;

  try {
    compiler = originalRequire(localPath)
    self.removeListener();
  } catch (err) {
    throw self.errors('noPath', localPath);
  }

  return compiler;
}


/**
 * Fetches solc versions object from remote solc-bin. This includes an array of build
 * objects with detailed version info, an array of release version numbers
 * and their terminal url segment strings, and a latest version key with the
 * same.
 * @return {Object} versions
 */
CompilerProvider.prototype.getVersions = function(){
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
CompilerProvider.prototype.getVersionUrlSegment = function(version, allVersions){

  if (allVersions.releases[version]) return allVersions.releases[version];

  const isPrerelease = version.includes('nightly') || version.includes('commit');

  if (isPrerelease) {
    for (let build of allVersions.builds) {
      const exists = build['prerelease'] === version  ||
                     build['build'] === version       ||
                     build['longVersion'] === version;

      if (exists) return build['path'];
    }
  }

  return null;
}

/**
 * Downloads solc specified by `version` after attempting retrieve it from cache on local machine,
 * @param  {String} version ex: "0.4.1", "0.4.16-nightly.2017.8.9+commit.81887bc7"
 * @return {Module}         solc
 */
CompilerProvider.prototype.getByUrl = function(version){
  const self = this;

  return self
    .getVersions(self.config.versionsUrl)
    .then(allVersions => {
      const file = self.getVersionUrlSegment(version, allVersions);

      if (!file)               throw self.errors('noVersion', version);

      if (self.isCached(file)) return self.getFromCache(file);

      const url = self.config.compilerUrlRoot + file;

      return request
        .get(url)
        .then(response => {
          self.addToCache(response, file);
          return self.compilerFromString(response);
        })
        .catch(err => { throw self.errors('noRequest', url, err)});
    });
}

/**
 * Makes solc.compileStandard a wrapper to a child process invocation of dockerized solc.
 * @return {Object} solc output
 */
CompilerProvider.prototype.getDocker = function(){
  const version = this.config.solc;

  this.validateDocker();

  return this.getVersions().then(versions => {
    return {

      compileStandard: (options) => {
        const command = 'docker run -i ethereum/solc:' + version + ' --standard-json';
        const result = child.execSync(command, {input: options});
        return String(result);
      },

      version: () => {
        return (version === 'stable')
          ? versions.latestRelease
          : version
      }
    }
  })
}

/**
 * Makes solc.compileStandard a wrapper to a child process invocation of dockerized solc.
 * @return {Object} solc output
 */
CompilerProvider.prototype.getNative = function(){
  const version = this.config.solc;

  return this.getVersions().then(versions => {
    return {

      compileStandard: (options) => {
        const command = 'solc --standard-json';
        const result = child.execSync(command, {input: options});
        return String(result);
      },

      version: () => {
        return (version === 'stable')
          ? versions.latestRelease
          : version
      }
    }
  })
}

//------------------------------------ Utils -------------------------------------------------------

/**
 * Returns true if file exists or `localPath` is an absolute path.
 * @param  {String}  localPath
 * @return {Boolean}
 */
CompilerProvider.prototype.isLocal = function(localPath){
  return fs.existsSync(localPath) || path.isAbsolute(localPath);
}

/**
 * Checks to make sure image is specified in the config, that docker exists and that
 * the image exists locally. If the last condition isn't true, docker will try to pull
 * it down and this breaks everything.
 * @throws {Error}
 */
CompilerProvider.prototype.validateDocker = function(){
  let result;
  const image = this.config.solc;

  // Image specified
  if (!image) throw this.errors('noString', image);

  // Docker exists locally
  try {
    result = child.execSync('docker -v');
  } catch(err){
    throw this.errors('noDocker');
  }

  // Image exists locally
  try {
    child.execSync('docker inspect --type=image ethereum/solc:' + image);
  } catch(err){
    throw this.errors('noImage', image);
  }
}

/**
 * Returns path to cached solc version
 * @param  {String} fileName ex: "soljson-v0.4.21+commit.dfe3193c.js"
 * @return {String}          path
 */
CompilerProvider.prototype.resolveCache = function(fileName){
  const thunk = findCacheDir({name: 'truffle', cwd: __dirname, thunk: true});
  return thunk(fileName);
}

/**
 * Returns true if `fileName` exists in the cache.
 * @param  {String}  fileName   ex: "soljson-v0.4.21+commit.dfe3193c.js"
 * @return {Boolean}
 */
CompilerProvider.prototype.isCached = function(fileName){
  const file = this.resolveCache(fileName);
  return fs.existsSync(file);
}

/**
 * Write  to the cache at `config.cachePath`. Creates `cachePath` directory if
 * does not exist.
 * @param {String} code       JS code string downloaded from solc-bin
 * @param {String} fileName   ex: "soljson-v0.4.21+commit.dfe3193c.js"
 */
CompilerProvider.prototype.addToCache = function(code, fileName){
  if (!this.config.cache) return;

  const filePath = this.resolveCache(fileName);
  fs.writeFileSync(filePath, code);
}

/**
 * Retrieves usable solc module from cache
 * @param  {String} file  ex: "soljson-v0.4.21+commit.dfe3193c.js"
 * @return {Module}       solc
 */
CompilerProvider.prototype.getFromCache = function(fileName){
  const filePath = this.resolveCache(fileName)
  const cached = fs.readFileSync(filePath, "utf-8");
  return this.compilerFromString(cached);
}

/**
 * Converts the JS code string obtained from solc-bin to usable node module.
 * @param  {String} code JS code
 * @return {Module}      solc
 */
CompilerProvider.prototype.compilerFromString = function(code){
  const solc = this.getDefault();
  const compiler = requireFromString(code);
  const wrapped = solc.setupMethods(compiler);
  this.removeListener();
  return wrapped;
}

/**
 * Cleans up error listeners set (by solc?) when requiring it. (This code inherited from
 * previous implementation, note to self - ask Tim about this)
 */
CompilerProvider.prototype.removeListener = function(){
  const listeners = process.listeners("uncaughtException");
  const execeptionHandler = listeners[listeners.length - 1];

  if (execeptionHandler) {
    process.removeListener("uncaughtException", execeptionHandler);
  }
}

/**
 * Error formatter
 * @param  {String} kind  descriptive key
 * @param  {String} input contextual info for error
 * @param  {Object} err   [optional] additional error associated with this error
 * @return {Error}
 */
CompilerProvider.prototype.errors = function(kind, input, err){
  const info = 'Run `truffle compile --list` to see available versions.'

  const kinds = {
    noPath:    "Could not find compiler at: " + input,
    noVersion: "Could not find compiler version:\n" + input + ".\n" + info,
    noString:  "`compiler.solc` option must be string specifying a path, solc version, or docker image, got: " + input,
    noRequest: "Failed to complete request to: " + input + ".\n\n" + err,
    noDocker: "You are trying to run dockerized solc, but docker is not installed on this machine.",
    noImage: "Please pull " + input + " from docker before trying to compile with it.",
  }

  return new Error(kinds[kind]);
}

module.exports = CompilerProvider;

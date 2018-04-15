const path = require('path');
const fs = require('fs');
const request = require('request-promise');
const requireFromString = require('require-from-string');
const mkdirp = require('mkdirp');


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
  compilerUrl: 'https://solc-bin.ethereum.org/bin/',
  compilerNpm: 'solc',
  cache: true,
  cachePath: '/var/lib/truffle/cache/solc/',
}

//----------------------------------- Interface  ---------------------------------------------------

/**
 * Loads solc from four possible locations:
 * - local node_modules            (param: <undefined>)
 * - absolute path to a local solc (param: <path>)
 * - a solc cache                  (param: <version-string> && cache contains version)
 * - a remote solc-bin source      (param: <version-string> && version not cached)
 *
 * @param  {String} options [optional] options to pass to native solc binary
 * @return {Module}          solc
 */
CompilerProvider.prototype.load = function(options){
  const self = this;
  const solc = self.config.solc;

  return new Promise((accept, reject) => {
    const useDefault = !solc;
    const useLocal =   !useDefault && self.isLocal(solc);
    const useRemote =  !useLocal;

    if (useDefault) return accept(self.getDefault());
    if (useLocal)   return accept(self.getLocal(solc));
    if (useRemote)  return accept(self.getByUrl(solc));
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
  const compiler = require(this.config.compilerNpm);
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
    compiler = require(localPath)
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
  url = self.config.versionsUrl;

  return request(url)
    .then(list => JSON.parse(list))
    .catch(err => self.errors('noRequest', url, err));
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

      const url = self.config.compilerUrl + file;

      return request
        .get(url)
        .then(response => {
          self.addToCache(response, file);
          return self.compilerFromString(response);
        })
        .catch(err => self.errors('noRequest', url, err));
    });
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
 * Returns true if `fileName` exists in the cache.
 * @param  {String}  fileName   ex: "soljson-v0.4.21+commit.dfe3193c.js"
 * @return {Boolean}
 */
CompilerProvider.prototype.isCached = function(fileName){
  return fs.existsSync(this.config.cachePath + fileName);
}

/**
 * Write  to the cache at `config.cachePath`. Creates `cachePath` directory if
 * does not exist.
 * @param {String} code       JS code string downloaded from solc-bin
 * @param {String} fileName   ex: "soljson-v0.4.21+commit.dfe3193c.js"
 */
CompilerProvider.prototype.addToCache = function(code, fileName){
  if (!this.config.cache) return;

  if (!fs.existsSync(this.config.cachePath)){
    mkdirp.sync(this.config.cachePath);
  }

  fs.writeFileSync(this.config.cachePath + fileName, code);
}

/**
 * Retrieves usable solc module from cache
 * @param  {String} file  ex: "soljson-v0.4.21+commit.dfe3193c.js"
 * @return {Module}       solc
 */
CompilerProvider.prototype.getFromCache = function(fileName){
  const cached = fs.readFileSync(this.config.cachePath + fileName, "utf-8");
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
  return solc.setupMethods(compiler);
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
    noString:  "Expected string (`path` or `version`), got: " + input.toString(),
    noRequest: "Failed to complete request to: " + input + ".\n\n" + err,
  }

  return new Error(kinds[kind]);
}

module.exports = CompilerProvider;

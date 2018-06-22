const child = require('child_process');
const solcWrap = require('./solcWrap.js');
const Supplier = require("truffle-supplier");
const inherits = require("util").inherits;


//------------------------------ Constructor/Config ------------------------------------------------

inherits(CompilerSupplier, Supplier);

/**
 * Constructor:
 * @param {Object} _config (see `supplier.config`)
 */
function CompilerSupplier(_config){
  CompilerSupplier.super_.call(this, _config);
}

/**
 * Default configuration
 * @type {Object}
 */
CompilerSupplier.prototype.config = {
  componentName: "solc",
  versionsUrl: 'https://solc-bin.ethereum.org/bin/list.json',
  urlRoot: 'https://solc-bin.ethereum.org/bin/',
  dockerTagsUrl: 'https://registry.hub.docker.com/v2/repositories/ethereum/solc/tags/',
  dockerImageName: 'ethereum/solc',
  packageName: "solc",
  commandBin: 'solc',
  commandArgs: '--standard-json'
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
CompilerSupplier.prototype.getReleases = function(){
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
 * Gets solc from `node_modules`.`
 * @return {Module} solc
 */
CompilerSupplier.prototype.getDefault = function(){
  // override method
  const compiler = require("solc");
  this.removeListener();
  return compiler;
}

/**
 * Gets an npm installed solc from specified path.
 * @param  {String} localPath
 * @return {Module}
 */
CompilerSupplier.prototype.getLocal = function(localPath){
  const self = this;
  let compiler = CompilerSupplier.super_.prototype
    .getLocal.call(this, localPath);

  this.removeListener();

  return compiler;
}


/**
 * Returns terminal url segment for `version` from the versions object
 * generated  by `getVersions`.
 * @param  {String} version         ex: "0.4.1", "0.4.16-nightly.2017.8.9+commit.81887bc7"
 * @param  {Object} allVersions     (see `getVersions`)
 * @return {String} url             ex: "soljson-v0.4.21+commit.dfe3193c.js"
 */
CompilerSupplier.prototype.getVersionUrlSegment = function(version, allVersions){

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
 * Makes solc.compileStandard a wrapper to a child process invocation of dockerized solc
 * or natively build solc. Also fetches a companion solcjs for the built js to parse imports
 * @override
 * @return {Object} solc output
 */
CompilerSupplier.prototype.getCommandWrapper = function(command, version){
  const commit = this.getCommitFromVersion(version);

  return this
    .getByUrl(commit)
    .then(solcjs => ({
      compileStandard: (options) => String(child.execSync(command, {input: options})),
      version: () => version,
      importsParser: solcjs,
    }));
}

/**
 * Retrieves usable solc module from cache
 * @param  {String} file  ex: "soljson-v0.4.21+commit.dfe3193c.js"
 * @return {Module}       solc
 */
CompilerSupplier.prototype.getModuleWrapper = function (module) {
  const wrapped = solcWrap(module);
  this.removeListener();
  return Promise.resolve(wrapped);
}

/**
 * Extracts a commit key from the version info returned by native/docker solc.
 * We use this to fetch a companion solcjs from solc-bin in order to parse imports
 * correctly.
 * @param  {String} versionString   version info from ex: `solc -v`
 * @return {String}                 commit key, ex: commit.4cb486ee
 */
CompilerSupplier.prototype.getCommitFromVersion = function(versionString){
  return 'commit.' + versionString.match(/commit\.(.*?)\./)[1]
}

/**
 * Cleans up error listeners set (by solc?) when requiring it. (This code inherited from
 * previous implementation, note to self - ask Tim about this)
 */
CompilerSupplier.prototype.removeListener = function(){
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
CompilerSupplier.prototype.errors = function(kind, input, err){
  const info = 'Run `truffle compile --list` to see available versions.'

  const kinds = {

    noPath:    "Could not find compiler at: " + input,
    noVersion: "Could not find compiler version:\n" + input + ".\n" + info,
    noRequest: "Failed to complete request to: " + input + ".\n\n" + err,
    noDocker:  "You are trying to run dockerized solc, but docker is not installed.",
    noImage:   "Please pull " + input + " from docker before trying to compile with it.",
    noNative:  "Could not execute local solc binary: " + err,

    // Lists
    noString:  "`compiler.version` option must be a string specifying:\n" +
               "   - a path to a locally installed solcjs\n" +
               "   - a solc version (ex: '0.4.22')\n" +
               "   - a docker image name (ex: 'stable')\n" +
               "Received: " + input + " instead.",
  }

  return new Error(kinds[kind]);
}

module.exports = CompilerSupplier;

var path = require("path");
var fs = require("fs");
var filter = require("async/filter");
var detectSeries = require("async/detectSeries");
var eachSeries = require("async/eachSeries")
var contract = require("truffle-contract");
var FSSource = require("./fs.js");

function EPM(working_directory, contracts_build_directory) {
  this.working_directory = working_directory;
  this.contracts_build_directory = contracts_build_directory;
};

EPM.prototype.require = function(import_path, search_path) {
  if (import_path.indexOf(".") == 0 || import_path.indexOf("/") == 0) {
    return null;
  }

  // Look to see if we've compiled our own version first.
  var contract_filename = path.basename(import_path);
  var contract_name = path.basename(import_path, ".sol");

  // We haven't compiled our own version. Assemble from data in the lockfile.
  var separator = import_path.indexOf("/")
  var package_name = import_path.substring(0, separator);

  var install_directory = path.join(this.working_directory, "installed_contracts");
  var lockfile = path.join(install_directory, package_name, "lock.json");

  try {
    lockfile = fs.readFileSync(lockfile, "utf8");
  } catch (e) {
    return null;
  }

  lockfile = JSON.parse(lockfile);

  var json = {
    contract_name: contract_name,
    networks: {}
  };

  // TODO: contracts that reference other types
  // TODO: contract types that specify a hash as their key
  // TODO: imported name doesn't match type but matches deployment name
  var contract_types = lockfile.contract_types || {};
  var type = contract_types[contract_name];

  // No contract name of the type asked.
  if (!type) return null;

  json.abi = type.abi;
  json.unlinked_binary = type.bytecode;

  // Go through deployments and save all of them
  Object.keys(lockfile.deployments || {}).forEach(function(blockchain) {
    var deployments = lockfile.deployments[blockchain];

    Object.keys(deployments).forEach(function(name) {
      var deployment = deployments[name];
      if (deployment.contract_type == contract_name) {
        json.networks[blockchain] = {
          events: {},
          links: {},
          address: deployment.address
        };
      }
    });
  });

  return json;
}

EPM.prototype.resolve = function(import_path, imported_from, callback) {
  var separator = import_path.indexOf("/");
  var package_name = import_path.substring(0, separator);
  var internal_path = import_path.substring(separator + 1);
  var installDir = this.working_directory;

  // If nothing's found, body returns `undefined`
  var body;

  while(true){
    var file_path = path.join(installDir, "installed_contracts", import_path);

    try {
      body = fs.readFileSync(file_path, {encoding: "utf8"});
      break;
    }
    catch(err){}

    file_path = path.join(installDir, "installed_contracts", package_name, "contracts", internal_path)

    try {
      body = fs.readFileSync(file_path, {encoding: "utf8"});
      break;
    }
    catch(err){}

    // Recurse outwards until impossible
    var oldInstallDir = installDir;
    installDir = path.join(installDir, '..');
    if (installDir === oldInstallDir) {
      break;
    }
  }

  return callback(null, body, import_path);
},

// We're resolving package paths to other package paths, not absolute paths.
// This will ensure the source fetcher conintues to use the correct sources for packages.
// i.e., if some_module/contracts/MyContract.sol imported "./AnotherContract.sol",
// we're going to resolve it to some_module/contracts/AnotherContract.sol, ensuring
// that when this path is evaluated this source is used again.
EPM.prototype.resolve_dependency_path = function(import_path, dependency_path) {
  var dirname = path.dirname(import_path);
  var resolved_dependency_path = path.join(dirname, dependency_path);

  // Note: We use `path.join()` here to take care of path idiosyncrasies
  // like joining "something/" and "./something_else.sol". However, this makes
  // paths OS dependent, and on Windows, makes the separator "\". Solidity
  // needs the separator to be a forward slash. Let's massage that here.
  resolved_dependency_path = resolved_dependency_path.replace(/\\/g, "/");

  return resolved_dependency_path;
};

module.exports = EPM;

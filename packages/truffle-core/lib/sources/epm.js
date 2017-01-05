var path = require("path");
var fs = require("fs");
var dir = require("node-dir");
var async = require("async");
var EthPM = require("ethpm");
var Pudding = require("ether-pudding");

function EPM(config) {
  this.config = config;
};

EPM.prototype.find = function(import_path, callback) {
  var separator = import_path.indexOf("/")
  var package_name = import_path.substring(0, separator);
  var internal_path = import_path.substring(separator + 1);
  var install_directory = path.join(this.config.working_directory, "installed_contracts");

  var file_contents = undefined;

  async.detectSeries([
    path.join(install_directory, import_path),
    path.join(install_directory, package_name, "contracts", internal_path)
  ], function(file_path, finished) {
    fs.readFile(file_path, {encoding: "utf8"}, function(err, body) {
      if (err) return finished(null, false);

      file_contents = body;
      finished(null, true);
    });
  }, function(err, existing_path) {
    // If there's an error, that means we can't read the source even if
    // it exists. Treat it as if it doesn't by ignoring any errors.
    // Perhaps we can do something better here in the future.
    return callback(null, file_contents);
  });
};

// We're resolving package paths to other package paths, not absolute paths.
// This will ensure the source fetcher conintues to use the correct sources for packages.
// i.e., if some_module/contracts/MyContract.sol imported "./AnotherContract.sol",
// we're going to resolve it to some_module/contracts/AnotherContract.sol, ensuring
// that when this path is evaluated this source is used again.
EPM.prototype.resolve_dependency_path = function(import_path, dependency_path) {
  var dirname = path.dirname(import_path);
  return path.join(dirname, dependency_path);
};

EPM.prototype.provision_contracts = function(callback) {
  // Create a new config; host and registry don't matter here.
  var pkg = new EthPM(this.config.working_directory);

  // TODO: Warn when overwriting a contract type/deployment from another dependency.
  pkg.installed_artifacts().then(function(artifacts) {
    var list = {};

    Object.keys(artifacts).forEach(function(package_name) {
      var contract_types = artifacts[package_name].contract_types;

      // TODO: Type names have special syntax when there are conflicts. Handle that syntax.
      Object.keys(contract_types).forEach(function(type_name) {
        var contract_type = contract_types[type_name];
        contract_type.contract_name = type_name;
        list[type_name] = Pudding.whisk(contract_type);
      });
    });

    callback(null, list);
  }).catch(callback);
};

module.exports = EPM;

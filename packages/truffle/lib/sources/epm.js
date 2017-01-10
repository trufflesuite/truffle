var path = require("path");
var fs = require("fs");
var dir = require("node-dir");
var async = require("async");
var EthPM = require("ethpm");
var contract = require("truffle-contract");
var Blockchain = require("../blockchain");

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
  var self = this;

  // Create a new config; host and registry don't matter here.
  var pkg = new EthPM(this.config.working_directory);

  // TODO: Warn when overwriting a contract type/deployment from another dependency.
  // This would happen when two dependencies name the same contract type/deployment.
  pkg.installed_artifacts().then(function(artifacts) {
    var list = {};

    var package_names = Object.keys(artifacts);

    // First do contract types.
    package_names.forEach(function(package_name) {
      var contract_types = artifacts[package_name].contract_types || {};

      // TODO: Type names have special syntax when there are conflicts. Handle that syntax.
      Object.keys(contract_types).forEach(function(type_name) {
        var contract_type = contract_types[type_name];
        contract_type.contract_name = type_name;
        list[type_name] = contract_type;
      });
    });

    // Now do deployments, which requires finding the correct blockchain in each deployment.
    async.eachSeries(package_names, function(package_name, finished) {
      var blockchains = artifacts[package_name].deployments || {};

      async.filter(Object.keys(blockchains), function(blockchain, done) {
        Blockchain.matches(blockchain, self.config.provider, function(err, truthy) {
          done(!err && truthy);
        });
      }, function(filtered) {
        // TODO: handle references to contract types of external packages.
        filtered.forEach(function(blockchain) {
          var deployments = blockchains[blockchain];
          Object.keys(deployments).forEach(function(deployment_name) {
            var deployment = deployments[deployment_name];

            // If we can find the right type, then set the address.
            if (list[deployment.contract_type]) {
              list[deployment.contract_type].address = deployment.address;
            }
          });
        })

        finished();
      });
    }, function(err) {
      if (err) return callback(err);

      // Done with all packages. Now whisk all contracts in the list.
      Object.keys(list).forEach(function(type_name) {
        var contract_type = list[type_name];
        list[type_name] = contract(contract_type);
      });

      callback(null, list);
    })
  }).catch(callback);
};

module.exports = EPM;

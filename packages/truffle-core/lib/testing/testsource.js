var Deployed = require("./deployed");
var path = require("path");
var fs = require("fs");
var contract = require("truffle-contract");

function TestSource(config) {
  this.config = config;
};

TestSource.prototype.require = function(import_path) {
  return null; // FSSource will get it.
};

TestSource.prototype.resolve = function(import_path, callback) {
  var self = this;

  if (import_path == "truffle/DeployedAddresses.sol") {
    return fs.readdir(this.config.contracts_build_directory, function(err, files) {
      if (err) return callback(err);

      var promises = files.map(function(file) {
        return new Promise(function(accept, reject) {
          fs.readFile(path.join(self.config.contracts_build_directory, file), "utf8", function(err, body) {
            if (err) return reject(err);
            accept(body);
          });
        });
      });

      Promise.all(promises).then(function(files_data) {
        var addresses = files_data.map(function(data) {
          return JSON.parse(data);
        }).map(function(json) {
          return contract(json);
        }).map(function(c) {
          c.setNetwork(self.config.network_id);
          if (c.isDeployed()) {
            return c.address;
          }
          return null;
        });

        var mapping = {};

        addresses.forEach(function(address, i) {
          var contract_name = path.basename(files[i], ".json");

          if (contract_name == "Assert" || contract_name == "DeployedAddresses") return;

          mapping[contract_name] = address;
        });

        var addressSource = Deployed.makeSolidityDeployedAddressesLibrary(mapping);

        callback(null, addressSource);
      }).catch(callback);
    });
  }

  if (import_path == "truffle/Assert.sol") {
    return fs.readFile(path.resolve(path.join(__dirname, "Assert.sol")), {encoding: "utf8"}, callback);
  }

  return callback();
};

TestSource.prototype.resolve_dependency_path = function(import_path, dependency_path) {
  return dependency_path;
}

module.exports = TestSource;

var Schema = require("truffle-contract-schema");
var fs = require("fs-extra");
var path = require("path");
var async = require("async");
var _ = require("lodash");

function Artifactor(contracts_build_directory) {
  this.contracts_build_directory = contracts_build_directory;
};

Artifactor.prototype.save = function(options, extra_options) {
  var self = this;

  return new Promise(function(accept, reject) {
    options = Schema.normalizeOptions(options, extra_options);

    if (options.contract_name == null) {
      return reject("You must specify a contract name.");
    }

    var filename = path.resolve(path.join(self.contracts_build_directory, options.contract_name + ".json"));

    fs.readFile(filename, {encoding: "utf8"}, function(err, json) {
      // No need to handle the error. If the file doesn't exist then we'll start afresh
      // with a new binary (see generateBinary()).
      var existing_binary;

      if (!err) {
        try {
          existing_binary = JSON.parse(json);
        } catch (e) {
          // Do nothing
        }
      }

      var final_binary;
      try {
        final_binary = Schema.generateBinary(options, existing_binary);
      } catch (e) {
        return reject(e);
      }

      fs.outputFile(filename, JSON.stringify(final_binary, null, 2), "utf8", function(err) {
        if (err) return reject(err);
        accept();
      });
    });
  });
};

Artifactor.prototype.saveAll = function(contracts, options) {
  var self = this;
  options = options || {};

  if (Array.isArray(contracts)) {
    var arr = contracts;
    contracts = {};
    arr.forEach(function(contract) {
      contracts[contract.contract_name] = contract;
    });
  }

  return new Promise(function(accept, reject) {
    var destination = self.contracts_build_directory;

    fs.stat(destination, function(err, stat) {
      if (err) {
        return reject(new Error("Desination " + destination + " doesn't exist!"));
      }

      async.each(Object.keys(contracts), function(contract_name, done) {
        var contract_data = contracts[contract_name];
        contract_data.contract_name = contract_data.contract_name || contract_name;

        var filename = path.join(destination, contract_name + ".json");

        // Finally save the contract.
        self.save(contract_data).then(done).catch(done);
      }, function(err) {
        if (err) return reject(err);
        accept();
      });
    });
  });
};

module.exports = Artifactor;

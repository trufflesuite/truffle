const Deployed = require("./deployed");
const path = require("path");
const fse = require("fs-extra");
const contract = require("truffle-contract");
const find_contracts = require("truffle-contract-sources");

function TestSource(config) {
  this.config = config;
}

TestSource.prototype.require = function() {
  return null; // FSSource will get it.
};

TestSource.prototype.resolve = function(importPath, callback) {
  const self = this;

  if (importPath === "truffle/DeployedAddresses.sol") {
    return find_contracts(this.config.contracts_directory, function(
      err,
      sourceFiles
    ) {
      // Ignore this error. Continue on.

      let abstractionFiles;
      try {
        abstractionFiles = fse.readdirSync(
          self.config.contracts_build_directory
        );
      } catch (error) {
        return callback(error);
      }

      const mapping = {};

      const blacklist = ["Assert", "DeployedAddresses"];

      // Ensure we have a mapping for source files and abstraction files
      // to prevent any compile errors in tests.
      sourceFiles.forEach(file => {
        const name = path.basename(file, ".sol");
        if (blacklist.indexOf(name) >= 0) return;
        mapping[name] = false;
      });

      abstractionFiles.forEach(file => {
        const name = path.basename(file, ".json");
        if (blacklist.indexOf(name) >= 0) return;
        mapping[name] = false;
      });

      const promises = abstractionFiles.map(file => {
        return fse.readFile(
          path.join(self.config.contracts_build_directory, file),
          "utf8"
        );
      });

      Promise.all(promises)
        .then(filesData => {
          const addresses = filesData
            .map(data => JSON.parse(data))
            .map(json => contract(json))
            .map(c => {
              c.setNetwork(self.config.network_id);
              if (c.isDeployed()) return c.address;
              return null;
            });

          addresses.forEach((address, i) => {
            const name = path.basename(abstractionFiles[i], ".json");

            if (blacklist.indexOf(name) >= 0) return;

            mapping[name] = address;
          });

          return Deployed.makeSolidityDeployedAddressesLibrary(
            mapping,
            self.config.compilers
          );
        })
        .then(addressSource => {
          callback(null, addressSource, importPath);
        })
        .catch(callback);
    });
  }
  const assertLibraries = [
    "Assert",
    "AssertAddress",
    "AssertAddressArray",
    //      "AssertAddressPayableArray", only compatible w/ ^0.5.0
    "AssertBalance",
    "AssertBool",
    "AssertBytes32",
    "AssertBytes32Array",
    "AssertGeneral",
    "AssertInt",
    "AssertIntArray",
    "AssertString",
    "AssertUint",
    "AssertUintArray"
  ];

  for (const lib of assertLibraries) {
    if (importPath === `truffle/${lib}.sol`)
      return fse.readFile(
        path.resolve(path.join(__dirname, `${lib}.sol`)),
        { encoding: "utf8" },
        (err, body) => callback(err, body, importPath)
      );
  }

  return callback();
};

TestSource.prototype.resolve_dependency_path = (importPath, dependencyPath) => {
  return dependencyPath;
};

module.exports = TestSource;

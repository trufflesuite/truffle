const Deployed = require("./deployed");
const path = require("path");
const fse = require("fs-extra");
const contract = require("@truffle/contract");
// const { findContracts } = require("@truffle/contract-sources");

function TestSource(config, findContracts) {
  this.findContracts = findContracts;
  this.config = config;
}

TestSource.prototype.require = function() {
  return null; // FSSource will get it.
};

TestSource.prototype.resolve = async function(importPath, callback) {
  const self = this;

  if (importPath === "truffle/DeployedAddresses.sol") {
    const sourceFiles = await self.findContracts(this.config.contracts_directory);

    let abstractionFiles;
    const buildDirFiles = (abstractionFiles = fse.readdirSync(
      self.config.contracts_build_directory
    ));
    abstractionFiles = buildDirFiles.filter(file =>
      file.match(/^.*.json$/)
    );

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

    const filesData = abstractionFiles.map(file => {
      return fse.readFileSync(
        path.join(self.config.contracts_build_directory, file),
        "utf8"
      );
    });

    const addresses = filesData.map(data => JSON.parse(data))
      .map(json => contract(json))
      .map(c => {
        c.setNetwork(self.config.network_id);
        if (c.isDeployed()) return c.address;
        return null;
      });
console.log("the addresses --> %o", addresses);
    addresses.forEach((address, i) => {
      const name = path.basename(abstractionFiles[i], ".json");

      if (blacklist.indexOf(name) >= 0) return;

      mapping[name] = address;
    });

    const addressSource = Deployed.makeSolidityDeployedAddressesLibrary(
      mapping,
      self.config.compilers
    );
    return {
      body: addressSource,
      filePath: importPath
    };
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
    if (importPath === `truffle/${lib}.sol`) {
      const filePath = path.resolve(path.join(__dirname, `${lib}.sol`));
      const fileContents = fse.readFileSync(filePath, { encoding: "utf8" });
      return { body: fileContents, filePath: importPath };
    }
  }
};

TestSource.prototype.resolve_dependency_path = (importPath, dependencyPath) => {
  return dependencyPath;
};

module.exports = TestSource;

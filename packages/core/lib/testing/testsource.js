const Deployed = require("./deployed");
const path = require("path");
const fse = require("fs-extra");
const contract = require("@truffle/contract");
const find_contracts = require("@truffle/contract-sources");

module.exports = class TestSource {
  constructor(config) {
    this.config = config;
  }

  require() {
    return null; // FSSource will get it.
  }

  async resolve(importPath) {
    const self = this;

    if (importPath === "truffle/DeployedAddresses.sol") {
      const sourceFiles = await find_contracts(this.config.contracts_directory);

      let abstractionFiles;
      const buildDirFiles = (abstractionFiles = fse.readdirSync(
        self.config.contracts_build_directory
      ));
      abstractionFiles = buildDirFiles.filter(file => file.match(/^.*.json$/));

      const mapping = {};

      const blacklist = new Set(["Assert", "DeployedAddresses"]);

      // Ensure we have a mapping for source files and abstraction files
      // to prevent any compile errors in tests.
      sourceFiles.forEach(file => {
        const name = path.basename(file, ".sol");
        if (blacklist.has(name)) return;
        mapping[name] = false;
      });

      abstractionFiles.forEach(file => {
        const name = path.basename(file, ".json");
        if (blacklist.has(name)) return;
        mapping[name] = false;
      });

      const filesData = abstractionFiles.map(file => {
        return fse.readFileSync(
          path.join(self.config.contracts_build_directory, file),
          "utf8"
        );
      });

      const addresses = filesData.map(data => {
        const c = contract(JSON.parse(data));
        c.setNetwork(self.config.network_id);
        if (c.isDeployed()) return c.address;
        return null;
      });

      addresses.forEach((address, i) => {
        const name = path.basename(abstractionFiles[i], ".json");

        if (blacklist.has(name)) return;

        mapping[name] = address;
      });

      const addressSource = Deployed.makeSolidityDeployedAddressesLibrary(
        mapping,
        self.config.compilers
      );
      return { body: addressSource, filePath: importPath };
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
        const body = fse.readFileSync(
          path.resolve(path.join(__dirname, `${lib}.sol`)),
          { encoding: "utf8" }
        );
        return { body, filePath: importPath };
      }
    }
  }

  resolveDependencyPath(importPath, dependencyPath) {
    return dependencyPath;
  }
};

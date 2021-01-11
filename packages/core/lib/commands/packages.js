const command = {
  command: "packages",
  description: "List available packages on connected EthPM Registry",
  builder: {},
  help: {
    usage: "truffle packages",
    options: []
  },
  run: function (options) {
    const Config = require("@truffle/config");
    const PackageV1 = require("@truffle/ethpm-v1");
    const PackageV3 = require("@truffle/ethpm-v3");

    const config = Config.detect(options);
    let listPackages;

    if (config.ethpm.version == "1") {
      listPackages = PackageV1.packages;
    } else if (config.ethpm.version == "3") {
      listPackages = PackageV3.packages;
    } else {
      throw new Error(`Unsupported ethpm version: ${config.ethpm.version}.`);
    }
    return listPackages(config);
  }
};

module.exports = command;

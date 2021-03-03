const { callbackify } = require("util");

const command = {
  command: "packages",
  description: "List available packages on connected EthPM Registry",
  builder: {},
  help: {
    usage: "truffle packages",
    options: []
  },
  run: function (options, done) {
    const Config = require("@truffle/config");
    const PackageV1 = require("@truffle/ethpm-v1");
    const PackageV3 = require("@truffle/ethpm-v3");

    const config = Config.detect(options);
    let listPackages;

    if (config.ethpm.version == "1") {
      listPackages = callbackify(PackageV1.packages);
    } else if (config.ethpm.version == "3") {
      listPackages = callbackify(PackageV3.packages);
    } else {
      done(new Error(`Unsupported ethpm version: ${config.ethpm.version}.`));
    }
    listPackages(config, done);
  }
};

module.exports = command;

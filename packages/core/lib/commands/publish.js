const command = {
  command: "publish",
  description: "Publish a package to the Ethereum Package Registry",
  builder: {},
  help: {
    usage: "truffle publish",
    options: []
  },
  run: async function (options) {
    const Config = require("@truffle/config");
    const PackageV1 = require("@truffle/ethpm-v1");
    const PackageV3 = require("@truffle/ethpm-v3");

    const config = Config.detect(options);
    let publishPackage;

    if (config.ethpm.version == "1") {
      publishPackage = PackageV1.publish;
    } else if (config.ethpm.version == "3") {
      publishPackage = PackageV3.publish;
    } else {
      throw new Error(`Unsupported ethpm version: ${config.ethpm.version}.`);
    }
    return publishPackage(config);
  }
};

module.exports = command;

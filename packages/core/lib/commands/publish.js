const { callbackify } = require("util");

const command = {
  command: "publish",
  description: "Publish a package to the Ethereum Package Registry",
  builder: {},
  help: {
    usage: "truffle publish",
    options: []
  },
  run: function (options, done) {
    const Config = require("@truffle/config");
    const PackageV1 = require("@truffle/ethpm-v1");
    const PackageV3 = require("@truffle/ethpm-v3");

    const config = Config.detect(options);
    let publishPackage;

    if (config.ethpm.version == "1") {
      publishPackage = callbackify(PackageV1.publish);
    } else if (config.ethpm.version == "3") {
      publishPackage = callbackify(PackageV3.publish);
    } else {
      done(new Error(`Unsupported ethpm version: ${config.ethpm.version}.`));
    }
    publishPackage(config, done);
  }
};

module.exports = command;

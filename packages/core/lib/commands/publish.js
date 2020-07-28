var command = {
  command: "publish",
  description: "Publish a package to the Ethereum Package Registry",
  builder: {},
  help: {
    usage: "truffle publish",
    options: []
  },
  run: async function (options, done) {
    var Config = require("@truffle/config");
    var PackageV1 = require("@truffle/ethpm-v1");
    var PackageV3 = require("@truffle/ethpm-v3");

    var config = Config.detect(options);

    if (config.ethpm.version == "1") {
      await PackageV1.publish(config);
    } else if (config.ethpm.version == "3") {
      await PackageV3.publish(config);
    } else {
      done(new Error(`Unsupported ethpm version: ${config.ethpm.version}.`));
    }
    done();
  }
};

module.exports = command;

const { callbackify } = require("util");

var command = {
  command: "packages",
  description: "List available packages on connected EthPM Registry",
  builder: {},
  help: {
    usage: "truffle packages",
    options: []
  },
  run: function (options, done) {
    var Config = require("@truffle/config");
    var PackageV1 = require("@truffle/ethpm-v1");
    var PackageV3 = require("@truffle/ethpm-v3");

    var config = Config.detect(options);
    let callbackFunction;

    if (config.ethpm.version == "1") {
      callbackFunction = callbackify(PackageV1.packages);
    } else if (config.ethpm.version == "3") {
      callbackFunction = callbackify(PackageV3.packages);
    } else {
      done(new Error(`Unsupported ethpm version: ${config.ethpm.version}.`));
    }
    callbackFunction(config, done);
  }
};

module.exports = command;

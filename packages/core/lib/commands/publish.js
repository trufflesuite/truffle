var command = {
  command: "publish",
  description: "Publish a package to the Ethereum Package Registry",
  builder: {},
  help: {
    usage: "truffle publish",
    options: []
  },
  run: async function(options, done) {
    var Config = require("@truffle/config");
    //var PackageV1 = require("@truffle/ethpm-v1");
    var PackageV3 = require("@truffle/ethpm-v3");

    var config = Config.detect(options);
    await PackageV3.publish(config, done);
  }
};

module.exports = command;

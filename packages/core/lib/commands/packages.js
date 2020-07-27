var command = {
  command: "packages",
  description: "List available packages on connected EthPM Registry",
  builder: {},
  help: {
    usage: "truffle packages",
    options: []
  },
  run: async function(options, done) {
    var Config = require("@truffle/config");
    var Package = require("../package");
    var PackageV1 = require("@truffle/ethpm-v1");
    var PackageV3 = require("@truffle/ethpm-v3");

    var config = Config.detect(options);
    await Package.packages(config, done);
  }
};

module.exports = command;

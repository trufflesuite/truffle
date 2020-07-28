var command = {
  command: "packages",
  description: "List available packages on connected EthPM Registry",
  builder: {},
  help: {
    usage: "truffle packages",
    options: []
  },
  run: async function (options, done) {
    var Config = require("@truffle/config");
    var PackageV3 = require("@truffle/ethpm-v3");

    var config = Config.detect(options);

    if (config.ethpm.version == "1" || config.ethpm.version == "3") {
      await PackageV3.packages(config);
    } else {
      done(new Error(`Unsupported ethpm version: ${config.ethpm.version}.`));
    }
    done();
  }
};

module.exports = command;

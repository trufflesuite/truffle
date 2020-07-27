var command = {
  command: "packages",
  description: "List available packages on connected EthPM Registry",
  builder: {},
  help: {
    usage: "truffle packages",
    options: [],
  },
  run: async function (options, done) {
    var Config = require("@truffle/config");
    var PackageV1 = require("ethpm-v1");
    var PackageV3 = require("ethpm-v3");

    var config = Config.detect(options);

    if (config.ethpm.version == "1") {
      PackageV1.packages(config)
        .then(() => {
          return done();
        })
        .catch(done);
    } else if (config.ethpm.version == "3") {
      PackageV3.packages(config)
        .then(() => {
          return done();
        })
        .catch(done);
    } else {
      done(new Error(`Unsupported ethpm version: ${config.ethpm.version}.`));
    }
  },
};

module.exports = command;

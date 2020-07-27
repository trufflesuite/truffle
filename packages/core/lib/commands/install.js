const command = {
  command: "install",
  description: "Install a package from the Ethereum Package Registry",
  builder: {},
  help: {
    usage: "truffle install <ethpmUri>",
    options: [
      {
        option: "ethpmUri",
        description: "ethPM URI for the target package to install. (required)"
      }
    ]
  },
  run: async function(options, done) {
    const Config = require("@truffle/config");
    //var PackageV1 = require("@truffle/ethpm-v1");
    var PackageV3 = require("@truffle/ethpm-v3");
    if (options._ && options._.length !== 1) {
      console.log(
        `Invalid number of arguments provided. Expected a single ethPM URI, received ${
          options._.length
        } arguments.`
      );
      done();
    }
    options.ethpmUri = options._[0];
    const config = Config.detect(options);
    await PackageV3.install(config, done);
  }
};

module.exports = command;

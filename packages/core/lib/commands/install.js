const command = {
  command: "install",
  description: "Install a package from the Ethereum Package Registry",
  builder: {},
  help: {
    usage: "truffle install <ethpm_uri>",
    options: [
      {
        option: "package_name",
        description: "ethPM URI for the target package to install. (required)"
      }
    ]
  },
  run: async function(options, done) {
    const Config = require("@truffle/config");
    const Package = require("../package");
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
    await Package.install(config, done);
  }
};

module.exports = command;

const command = {
  command: "install",
  description: "Install a package from the Ethereum Package Registry",
  builder: {},
  help: {
    usage: "truffle install <package_name>[@<version>]",
    options: [
      {
        option: "package_name",
        description:
          "Name of the package as listed in the Ethereum Package Registry. (required)"
      },
      {
        option: "<@version>",
        description:
          "When specified, will install a specific version of the package, otherwise " +
          "will install\n                    the latest version."
      }
    ]
  },
  run: async function(options, done) {
    const Config = require("@truffle/config");
    const Package = require("../package");
    if (options._ && options._.length == 1) {
      options.ethpm_uri = options._[0];
      const config = Config.detect(options);
      await Package.install(config, done);
    } else {
      console.log(
        `Invalid number of arguments provided. Expected a single ethPM URI, received ${
          options._.length
        } arguments`
      );
      done();
    }
  }
};

module.exports = command;

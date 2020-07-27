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
          "Name of the package as listed in the Ethereum Package Registry. (required)",
      },
      {
        option: "<@version>",
        description:
          "When specified, will install a specific version of the package, otherwise " +
          "will install\n                    the latest version.",
      },
    ],
  },
  run: function (options, done) {
    const Config = require("@truffle/config");
    const PackageV1 = require("ethpm-v1");
    const PackageV3 = require("ethpm-v3");

    if (options._ && options._.length > 0) options.packages = options._;

    const config = Config.detect(options);

    if (config.ethpm.version == "1") {
      PackageV1.install(config)
        .then(() => {
          return done();
        })
        .catch(done);
    } else if (config.ethpm.version == "3") {
      PackageV3.install(config)
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

const { callbackify } = require("util");

const command = {
  command: "install",
  description: "Install a package from the Ethereum Package Registry",
  builder: {},
  help: {
    usage: "truffle install <package-identifier> [--alias]",
    options: [
      {
        option: "packageIdentifier",
        description: `(required) Name of the package as listed in the Ethereum Package Registry. Accepted formats: packageName, packageName@version, ethpm URI, ipfs URI.`
      },
      {
        option: "--alias",
        description: "An alternate name under which to install this package."
      }
    ]
  },
  run: function (options, done) {
    const Config = require("@truffle/config");
    const PackageV1 = require("@truffle/ethpm-v1");
    const PackageV3 = require("@truffle/ethpm-v3");

    if (options._ && options._.length == 0) {
      done(
        new Error(
          `Please provide a package identifier. Run 'truffle help install' for more information on valid package identifiers.`
        )
      );
    }
    if (options._ && options._.length > 1) {
      done(
        new Error(
          `Multiple package identifiers detected. Only one package can be installed at a time.`
        )
      );
    }
    options.packageIdentifier = options._[0];

    const config = Config.detect(options);
    let callbackFunction;

    if (config.ethpm.version == "1") {
      callbackFunction = callbackify(PackageV1.install);
    } else if (config.ethpm.version == "3") {
      callbackFunction = callbackify(PackageV3.install);
    } else {
      done(new Error(`Unsupported ethpm version: ${config.ethpm.version}.`));
    }
    callbackFunction(config, done);
  }
};

module.exports = command;

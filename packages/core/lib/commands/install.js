const command = {
  command: "install",
  description: "Install a package from the Ethereum Package Registry",
  builder: {},
  help: {
    usage: "truffle install <packageId> [--alias]",
    options: [
      {
        option: "packageId",
        description: `(required) Name of the package as listed in the Ethereum Package Registry. 
          Accepted formats: packageName, packageName@version, ethpm URI, ipfs URI.`
      },
      {
        option: "--alias",
        description:
          "A different name under which this package will be installed."
      }
    ]
  },
  run: async function (options, done) {
    const Config = require("@truffle/config");
    const PackageV1 = require("@truffle/ethpm-v1");
    const PackageV3 = require("@truffle/ethpm-v3");

    if (options._ && options._.length == 0) {
      done(new Error(`Please provide a packageId.`));
    }
    if (options._ && options._.length > 1) {
      done(new Error(`Only one packageId can be installed at a time.`));
    }
    options.packageId = options._[0];

    const config = Config.detect(options);

    if (config.ethpm.version == "1") {
      await PackageV1.install(config);
    } else if (config.ethpm.version == "3") {
      await PackageV3.install(config);
    } else {
      done(new Error(`Unsupported ethpm version: ${config.ethpm.version}.`));
    }
    done();
  }
};

module.exports = command;

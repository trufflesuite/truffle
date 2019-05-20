module.exports = {
  command: "obtain",
  description: "Fetch and cache a specified compiler",
  help: {
    usage: "truffle obtain <--<compiler_name> <version>>",
    options: [
      {
        option: "<--<compiler_name> <version>>",
        description:
          `Download and cache a version of the specified compiler.\n` +
          `                    compiler_name must be one of the following: ` +
          `'solc'.(required)`
      }
    ]
  },
  run: function(options, done) {
    const CompilerSupplier = require("truffle-compile").CompilerSupplier;
    const SUPPORTED_COMPILERS = ["--solc"];
    const Config = require("truffle-config");
    const config = Config.default().with(options);
    const supplierOptions = {
      events: config.events,
      solcConfig: config.compilers.solc
    };
    const supplier = new CompilerSupplier(supplierOptions);

    config.events.emit("obtain:start");

    if (options.solc) {
      return this.downloadAndCacheSolc({ config, options, supplier })
        .then(done)
        .catch(done);
    }

    const message =
      `You have specified a compiler that is unsupported by ` +
      `Truffle.\nYou must specify one of the following ` +
      `compilers as well as a version as arguments: ` +
      `${SUPPORTED_COMPILERS.join(", ")}\nSee 'truffle help ` +
      `obtain' for more information and usage.`;
    return done(new Error(message));
  },

  downloadAndCacheSolc: async ({ config, options, supplier }) => {
    const { events } = config;
    const version = options.solc;
    try {
      const solc = await supplier.downloadAndCacheSolc(version);
      return events.emit("obtain:succeed", {
        compiler: {
          version: solc.version(),
          name: "Solidity"
        }
      });
    } catch (error) {
      return events.emit("obtain:fail");
    }
  }
};

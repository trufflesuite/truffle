module.exports = {
  command: "obtain",
  description: "Fetch and cache a specified compiler",
  help: {
    usage: "truffle obtain [--solc <version>]",
    options: [
      {
        option: "--solc <version>",
        description: `Download and cache a version of the solc compiler. (required)`
      }
    ]
  },
  run: function(options, done) {
    const SUPPORTED_COMPILERS = ["--solc"];
    const Config = require("@truffle/config");
    const config = Config.default().with(options);
    const CompilerSupplier = require("@truffle/compile-solidity")
      .CompilerSupplier;
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
      events.emit("obtain:succeed", {
        compiler: {
          version: solc.version(),
          name: "Solidity"
        }
      });
      return;
    } catch (error) {
      events.emit("obtain:fail");
      return;
    }
  }
};

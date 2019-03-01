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
    const supplier = new CompilerSupplier();
    const SUPPORTED_COMPILERS = ["--solc"];

    if (options.solc) {
      return this.downloadAndCacheSolc({ options, supplier })
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
  downloadAndCacheSolc: async ({ options, supplier }) => {
    const logger = options.logger || console;
    const version = options.solc;
    const solc = await supplier.downloadAndCacheSolc(version);
    return logger.log(
      `    > successfully downloaded and cached ${solc.version()}`
    );
  }
};

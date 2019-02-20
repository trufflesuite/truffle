module.exports = {
  command: "obtain",
  description: "Fetch and cache a specified solc version",
  help: {
    usage: "truffle obtain <version>",
    options: []
  },
  run: function(options, done) {
    const CompilerSupplier = require("truffle-compile").CompilerSupplier;
    const supplier = new CompilerSupplier();

    return this.downloadAndCacheSolc({ options, supplier })
      .then(done)
      .catch(done);
  },
  downloadAndCacheSolc: async ({ options, supplier }) => {
    const logger = options.logger || console;
    const version = options._[0];
    const solc = await supplier.downloadAndCacheSolc(version);
    return logger.log(
      `    > successfully downloaded and cached ${solc.version()}`
    );
  }
};

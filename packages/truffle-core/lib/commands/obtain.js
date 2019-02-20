const semver = require("semver");

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
    const version = options._[0];

    const isValidRange = semver.validRange(version);
    if (isValidRange) {
      return this.downloadAndCacheSolc({ options, supplier });
    }

    const message =
      `The version you entered is not valid. Please ` +
      `ensure ${version} is a valid version or constraint.`;
    done(message);
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

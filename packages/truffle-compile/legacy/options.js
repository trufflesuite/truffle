const expect = require("truffle-expect");

/**
 * Handle options compatibility
 */
module.exports = {
  normalizeOptions(options) {
    if (options.logger === undefined) options.logger = console;

    expect.options(options, ["contracts_directory", "compilers"]);
    expect.options(options.compilers, ["solc"]);

    options.compilers.solc.settings.evmVersion =
      options.compilers.solc.settings.evmVersion ||
      options.compilers.solc.evmVersion;
    options.compilers.solc.settings.optimizer =
      options.compilers.solc.settings.optimizer ||
      options.compilers.solc.optimizer ||
      {};

    // Grandfather in old solc config
    if (options.solc) {
      options.compilers.solc.settings.evmVersion = options.solc.evmVersion;
      options.compilers.solc.settings.optimizer = options.solc.optimizer;
    }

    // Certain situations result in `{}` as a value for compilationTargets
    // Previous implementations treated any value lacking `.length` as equivalent
    // to `[]`
    if (!options.compilationTargets || !options.compilationTargets.length) {
      options.compilationTargets = [];
    }

    return options;
  }
};

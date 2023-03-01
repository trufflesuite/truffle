const expect = require("@truffle/expect");
import type Config from "@truffle/config";

export const normalizeOptions = (options: Config) => {
  if (options.logger === undefined) options.logger = console;

  expect.options(options, ["contracts_directory", "compilers"]);
  expect.options(options.compilers, ["solc"]);

  options.compilers.solc.settings.evmVersion =
    options.compilers.solc.settings.evmVersion ||
    options.compilers.solc.evmVersion;

  if (options.compilers.solc.disableDefaults) {
    // if the user has disabled defaults, we don't want to set optimizer defaults; Solidity versions prior to 0.8.6 will produce different bytecodes if optimizer settings are missing vs. set to false; this matters for how Blockscout does verification
    options.compilers.solc.settings.optimizer =
      options.compilers.solc.settings.optimizer || {};
  } else {
    options.compilers.solc.settings.optimizer =
      options.compilers.solc.settings.optimizer ||
      options.compilers.solc.optimizer ||
      {};
  }

  // Grandfather in old solc config
  if (options.solc) {
    options.compilers.solc.settings.evmVersion = options.solc.evmVersion;
    options.compilers.solc.settings.optimizer = options.solc.optimizer;
  }

  // Certain situations result in `{}` as a value for compilationTargets
  // Previous implementations treated any value lacking `.length` as equivalent
  // to `[]`
  // (This also happens when run() is called from sources(), so
  // compilationTargets is not passed)
  if (!options.compilationTargets || !options.compilationTargets.length) {
    options.compilationTargets = [];
  }

  return options;
};

const OS = require("os");
const colors = require("colors");

// NOTE: In the future we might want to have this use an event-based system like
//   the migration reporter does.
module.exports = {
  compiledContracts: (logger = console, contracts = []) => {
    if (!contracts) return;
    logger.log("  > sources");
    contracts.forEach(contract => {
      logger.log("    " + contract);
    });
    logger.log("");
  },

  finishJob: (logger = console) => {
    logger.log(OS.EOL + colors.green("Compilation finished successfully"));
    logger.log(colors.green("=================================" + OS.EOL));
  },

  startJob: (logger = console) => {
    logger.log(colors.green(OS.EOL + "Starting compilation"));
    logger.log(colors.green("====================") + OS.EOL);
  },

  warnings: (logger = console, warnings) => {
    logger.log(colors.yellow("  > compilation warnings encountered:"));
    logger.log(warnings.map(warning => warning.formattedMessage).join());
  },

  writeArtifacts: (logger = console, contracts_build_directory) => {
    logger.log("  > writing artifacts to " + contracts_build_directory);
  }
};

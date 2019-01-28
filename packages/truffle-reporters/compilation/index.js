const path = require("path");
const OS = require("os");
const colors = require("colors");

module.exports = {
  compiledContracts: (options, contracts = []) => {
    if (!contracts) return;
    const logger = options.logger || console;
    contracts.forEach(contract => {
      logger.log("    > " + contract);
    });
    logger.log("");
  },

  finishJob: options => {
    const logger = options.logger || console;
    logger.log(OS.EOL + colors.green("Compilation finished successfully"));
    logger.log(colors.green("=================================" + OS.EOL));
  },

  startJob: options => {
    const logger = options.logger || console;
    logger.log(colors.green(OS.EOL + "Starting compilation"));
    logger.log(colors.green("====================") + OS.EOL);
  },

  warnings: (options, warnings) => {
    const logger = options.logger || console;
    logger.log(colors.yellow("    > compilation warnings encountered:"));
    logger.log(warnings.map(warning => warning.formattedMessage).join());
  },

  writeArtifacts: options => {
    const logger = options.logger || console;
    logger.log(
      "    > writing artifacts to ." +
        path.sep +
        path.relative(
          options.working_directory,
          options.contracts_build_directory
        )
    );
  }
};

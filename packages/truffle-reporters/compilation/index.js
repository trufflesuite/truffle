const path = require("path");
const OS = require("os");
const colors = require("colors");

module.exports = {
  compilingContract: (options, contract) => {
    const logger = options.logger || console;
    logger.log("    Compiling " + contract);
  },

  finishJob: options => {
    const logger = options.logger || console;
    logger.log(OS.EOL + colors.green("=================================="));
    logger.log(colors.green("Compilation finished successfully!"));
    logger.log(colors.green("==================================" + OS.EOL));
  },

  startJob: options => {
    const logger = options.logger || console;
    logger.log(OS.EOL + colors.green("===================="));
    logger.log(colors.green("Starting compilation"));
    logger.log(colors.green("====================") + OS.EOL);
  },

  warnings: (options, warnings) => {
    const logger = options.logger || console;
    logger.log(OS.EOL + colors.yellow("Compilation warnings encountered:"));
    logger.log(colors.yellow("=================================") + OS.EOL);
    logger.log(warnings.map(warning => warning.formattedMessage).join());
  },

  writeArtifacts: options => {
    const logger = options.logger || console;
    logger.log(
      OS.EOL +
        "    Writing artifacts to ." +
        path.sep +
        path.relative(
          options.working_directory,
          options.contracts_build_directory
        ) +
        OS.EOL
    );
  }
};

const path = require("path");
const OS = require("os");

module.exports = {
  startJob: options => {
    const logger = options.logger || console;
    logger.log("\nStarting compilation...");
    logger.log("=======================\n");
  },

  warnings: (options, warnings) => {
    const logger = options.logger || console;
    logger.log(OS.EOL + "Compilation warnings encountered:" + OS.EOL);
    logger.log(warnings.map(warning => warning.formattedMessage).join());
  },

  writeArtifacts: options => {
    const logger = options.logger || console;
    logger.log(
      "\n    Writing artifacts to ." +
        path.sep +
        path.relative(
          options.working_directory,
          options.contracts_build_directory
        ) +
        OS.EOL
    );
  }
};

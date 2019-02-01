const colors = require("colors");
const OS = require("os");

module.exports = {
  compiledSources(options, sources) {
    if (!sources) return;
    const logger = options.logger || console;
    sources.forEach(source => logger.log("    > " + source));
    logger.log("");
  },

  finishJob(options) {
    const logger = options.logger || console;
    logger.log(OS.EOL + "Compilation finished successfully." + OS.EOL);
  },

  initializeListeners(options) {
    const { emitter } = options;
    emitter.on("compile:startJob", this.startJob.bind(this, options));
    emitter.on("compile:finishJob", this.finishJob.bind(this, options));
    emitter.on(
      "compile:writeArtifacts",
      this.writeArtifacts.bind(this, options)
    );
    emitter.on("compile:warnings", this.warnings.bind(this, options));
    emitter.on(
      "compile:compiledSources",
      this.compiledSources.bind(this, options)
    );
    emitter.on(
      "compile:nothingToCompile",
      this.nothingToCompile.bind(this, options)
    );
  },

  nothingToCompile(options) {
    const logger = options.logger || console;
    logger.log("    > all contracts up to date");
    logger.log("    > nothing new to compile");
  },

  startJob(options) {
    const logger = options.logger || console;
    logger.log(OS.EOL + "Starting compilation");
    logger.log("====================" + OS.EOL);
  },

  warnings(options, warnings) {
    const logger = options.logger || console;
    logger.log(colors.yellow("    > compilation warnings encountered:"));
    logger.log(warnings.map(warning => warning.formattedMessage).join());
  },

  writeArtifacts(options, working_directory) {
    const logger = options.logger || console;
    logger.log("    > writing artifacts to ." + working_directory);
  }
};

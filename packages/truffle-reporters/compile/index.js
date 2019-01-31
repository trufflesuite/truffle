const colors = require("colors");
const OS = require("os");

module.exports = {
  compiledSources(options, data) {
    logger = options.logger || console;
    logger.log("contracts were compiled %o", data);
  },

  finishJob(options) {
    const logger = options.logger || console;
    logger.log(OS.EOL + colors.green("Compilation finished successfully"));
    logger.log(colors.green("=================================" + OS.EOL));
  },

  initializeListeners(options) {
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
  },

  startJob(options) {
    const logger = options.logger || console;
    logger.log(colors.green(OS.EOL + "Starting compilation"));
    logger.log(colors.green("====================") + OS.EOL);
  },

  warnings(options, data) {
    logger = options.logger || console;
    logger.log("warnings occurred %o", data);
  },

  writeArtifacts(options, data) {
    logger = options.logger || console;
    logger.log("artifacts were written %o", data);
  }
};

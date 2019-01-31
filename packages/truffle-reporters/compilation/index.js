module.exports = {
  compiledSources(options, data) {
    logger = options.logger || console;
    logger.log("contracts were compiled %o", data);
  },

  finishJob(options) {
    logger = options.logger || console;
    logger.log("the job was finished");
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
    logger = options.logger || console;
    logger.log("the job was started");
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

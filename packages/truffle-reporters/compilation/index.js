module.exports = {
  compiledSources(options, data) {
    logger = options.logger || console;
    logger.log("contracts were compiled %o", data);
  },

  default(options) {
    logger = options.logger || console;
    logger.log("this is the default event");
  },

  finishJob(options) {
    logger = options.logger || console;
    logger.log("the job was finished");
  },

  initializeListeners(options) {
    emitter.on("compilation:startJob", this.startJob.bind(this, options));
    emitter.on("compilation:finishJob", this.finishJob.bind(this, options));
    emitter.on(
      "compilation:writeArtifacts",
      this.writeArtifacts.bind(this, options)
    );
    emitter.on("compilation:warnings", this.warnings.bind(this, options));
    emitter.on(
      "compilation:compiledSources",
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

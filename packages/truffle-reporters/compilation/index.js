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

  startJob(options) {
    logger = options.logger || console;
    logger.log("the job was started");
  },

  triggerEvent(event, options, data) {
    switch (event) {
      case "startJob":
        return this.startJob(options);
      case "finishJob":
        return this.finishJob(options);
      case "warnings":
        return this.warnings(options, data);
      case "writeArtifacts":
        return this.writeArtifacts(options, data);
      case "compiledSources":
        return this.compiledSources(options, data);
      default:
        return this.default;
    }
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

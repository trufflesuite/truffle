module.exports = {
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
        return this.startJob(options, data);
      case "finishJob":
        return this.finishJob(options, data);
      default:
        return this.default;
    }
  }
};

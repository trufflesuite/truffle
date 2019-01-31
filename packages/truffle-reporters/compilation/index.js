module.exports = {
  default(options) {
    logger = options.logger || console;
    logger.log("this is the default event");
  },

  startJob(options, data) {
    logger = options.logger || console;
    logger.log("the job was started with %o", data);
  },

  triggerEvent(event, options, data) {
    switch (event) {
      case "startJob":
        return this.startJob(options, data);
      default:
        return this.default;
    }
  }
};

module.exports = {
  startJob: options => {
    const logger = options.logger || console;
    logger.log("\nStarting compilation...");
    logger.log("=======================");
  }
};

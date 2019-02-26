const ora = require("ora");

module.exports = {
  cleaningTempFiles() {
    ora.succeed();
    ora("cleaning up temporary files");
  },

  downloadingBox() {
    ora("Downloading").start();
  },

  finishJob(options) {
    ora.succeed();
    const logger = options.logger || console;
    logger.log("Unbox successful, sweet!");
  },

  initializeListeners(options) {
    const { emitter } = options;
    emitter.on("unbox:startJob", this.startJob.bind(this));
    emitter.on(
      "unbox:preparingToDownload",
      this.preparingToDownload.bind(this)
    );
    emitter.on("unbox:downloadingBox", this.downloadingBox.bind(this));
    emitter.on("unbox:cleaningTempFiles", this.cleaningTempFiles.bind(this));
    emitter.on("unbox:settingUpBox", this.settingUpBox.bind(this));
    emitter.on("unbox:finishJob", this.finishJob.bind(this, options));
    emitter.on("unbox:jobFailed", this.jobFailed.bind(this, options));
  },

  jobFailed(options) {
    const logger = options.logger || console;
    ora.fail();
    logger.log("Unbox failed!");
  },

  preparingToDownload() {
    ora("Preparing to download box");
  },

  settingUpBox() {
    ora.succeed();
    ora("Setting up box");
  },

  startJob(options) {
    const logger = options.logger || console;
    logger.log("Starting unbox");
  }
};

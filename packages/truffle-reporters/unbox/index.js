const ora = require("ora");
const OS = require("os");

const formatCommands = commands => {
  const names = Object.keys(commands);
  const maxLength = Math.max.apply(null, names.map(name => name.length));

  return names.map(name => {
    const spacing = Array(maxLength - name.length + 1).join(" ");
    return `  ${name}: ${spacing}${commands[name]}`;
  });
};

class UnboxReporter {
  constructor(options) {
    this.ora = ora;
    this.initializeListeners(options);
  }

  cleaningTempFiles(isStart) {
    if (isStart) {
      this.spinner = this.ora("Cleaning up temporary files").start();
    } else {
      this.spinner.succeed();
    }
  }

  downloadingBox(isStart) {
    if (isStart) {
      this.spinner = this.ora("Downloading").start();
    } else {
      this.spinner.succeed();
    }
  }

  jobFinished(options, boxConfig) {
    const logger = options.logger || console;
    logger.log(`${OS.EOL}Unbox successful, sweet!${OS.EOL}`);

    const commandMessages = formatCommands(boxConfig.commands);
    if (commandMessages.length > 0) logger.log("Commands:" + OS.EOL);

    commandMessages.forEach(message => logger.log(message));
    logger.log("");

    if (boxConfig.epilogue) {
      logger.log(boxConfig.epilogue.replace("\n", OS.EOL));
    }
  }

  initializeListeners(options) {
    const { emitter } = options;
    emitter.on("unbox:startJob", this.startJob.bind(this, options));
    emitter.on(
      "unbox:preparingToDownload:start",
      this.preparingToDownload.bind(this, true)
    );
    emitter.on(
      "unbox:preparingToDownload:end",
      this.preparingToDownload.bind(this, false)
    );
    emitter.on(
      "unbox:downloadingBox:start",
      this.downloadingBox.bind(this, true)
    );
    emitter.on(
      "unbox:downloadingBox:end",
      this.downloadingBox.bind(this, false)
    );
    emitter.on(
      "unbox:cleaningTempFiles:start",
      this.cleaningTempFiles.bind(this, true)
    );
    emitter.on(
      "unbox:cleaningTempFiles:end",
      this.cleaningTempFiles.bind(this, false)
    );
    emitter.on("unbox:settingUpBox:start", this.settingUpBox.bind(this, true));
    emitter.on("unbox:settingUpBox:end", this.settingUpBox.bind(this, false));
    emitter.on("unbox:jobFinished", this.jobFinished.bind(options, this));
    emitter.on("unbox:jobFailed", this.jobFailed.bind(this, options));
  }

  jobFailed(options) {
    const logger = options.logger || console;
    this.spinner.fail();
    logger.log("Unbox failed!");
  }

  preparingToDownload(isStart) {
    if (isStart) {
      this.spinner = this.ora("Preparing to download box").start();
    } else {
      this.spinner.succeed();
    }
  }

  settingUpBox() {
    if (isStart) {
      this.spinner = this.ora("Setting up box").start();
    } else {
      this.spinner.succeed();
    }
  }

  startJob(options) {
    const logger = options.logger || console;
    logger.log(`${OS.EOL}Starting unbox${OS.EOL}`);
  }
}

module.exports = UnboxReporter;

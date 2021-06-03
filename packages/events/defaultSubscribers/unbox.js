const ora = require("ora");
const OS = require("os");

const formatCommands = (commands) => {
  const names = Object.keys(commands);
  const maxLength = Math.max.apply(
    null,
    names.map((name) => name.length)
  );

  return names.map((name) => {
    const spacing = Array(maxLength - name.length + 1).join(" ");
    return `  ${name}: ${spacing}${commands[name]}`;
  });
};

module.exports = {
  initialization: function () {
    this.logger = console;
    this.ora = ora;
  },
  handlers: {
    "unbox:start": [
      function () {
        if (this.quiet) return;
        this.logger.log(`${OS.EOL}Starting unbox...`);
        this.logger.log(`=================${OS.EOL}`);
      },
    ],
    "unbox:preparingToDownload:start": [
      function () {
        if (this.quiet) return;
        this.spinner = this.ora("Preparing to download box").start();
      },
    ],
    "unbox:preparingToDownload:succeed": [
      function () {
        if (this.quiet) return;
        this.spinner.succeed();
      },
    ],
    "unbox:downloadingBox:start": [
      function () {
        if (this.quiet) return;
        this.spinner = this.ora("Downloading").start();
      },
    ],
    "unbox:downloadingBox:succeed": [
      function () {
        if (this.quiet) return;
        this.spinner.succeed();
      },
    ],
    "unbox:cleaningTempFiles:start": [
      function () {
        if (this.quiet) return;
        this.spinner = this.ora("Cleaning up temporary files").start();
      },
    ],
    "unbox:cleaningTempFiles:succeed": [
      function () {
        if (this.quiet) return;
        this.spinner.succeed();
      },
    ],
    "unbox:settingUpBox:start": [
      function () {
        if (this.quiet) return;
        this.spinner = this.ora("Setting up box").start();
      },
    ],
    "unbox:settingUpBox:succeed": [
      function () {
        if (this.quiet) return;
        this.spinner.succeed();
      },
    ],
    "unbox:succeed": [
      function ({ boxConfig }) {
        if (this.quiet) return;
        this.logger.log(`${OS.EOL}Unbox successful, sweet!${OS.EOL}`);

        const commandMessages = formatCommands(boxConfig.commands);
        if (commandMessages.length > 0) this.logger.log("Commands:" + OS.EOL);

        commandMessages.forEach((message) => this.logger.log(message));
        this.logger.log("");

        if (boxConfig.epilogue) {
          this.logger.log(boxConfig.epilogue.replace("\n", OS.EOL));
        }
      },
    ],
    "unbox:fail": [
      function () {
        if (this.quiet) return;
        if (this.spinner) this.spinner.fail();
        this.logger.log("Unbox failed!");
      },
    ],
  },
};

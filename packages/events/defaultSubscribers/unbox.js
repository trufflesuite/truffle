const Spinner = require("@truffle/spinners").Spinner;
const OS = require("os");

const formatCommands = commands => {
  const names = Object.keys(commands);
  const maxLength = Math.max.apply(
    null,
    names.map(name => name.length)
  );

  return names.map(name => {
    const spacing = Array(maxLength - name.length + 1).join(" ");
    return `  ${name}: ${spacing}${commands[name]}`;
  });
};

module.exports = {
  initialization: function () {
    this.logger = console;
    this.spinners = {};
  },
  handlers: {
    "unbox:start": [
      function () {
        if (this.quiet) {
          return;
        }
        this.logger.log(`${OS.EOL}Starting unbox...`);
        this.logger.log(`=================${OS.EOL}`);
      }
    ],
    "unbox:preparingToDownload:start": [
      function () {
        if (this.quiet) {
          return;
        }
        this.spinners.prepareDownloadSpinner = new Spinner(
          "events:subscribers:unbox:download-prepare",
          "Preparing to download box"
        );
      }
    ],
    "unbox:preparingToDownload:succeed": [
      function () {
        if (this.quiet) {
          return;
        }
        this.spinners.prepareDownloadSpinner.succeed();
      }
    ],
    "unbox:downloadingBox:start": [
      function () {
        if (this.quiet) {
          return;
        }
        this.spinners.downloadSpinner = new Spinner(
          "events:subscribers:unbox:download",
          "Downloading"
        );
      }
    ],
    "unbox:downloadingBox:succeed": [
      function () {
        if (this.quiet) {
          return;
        }
        this.spinners.downloadSpinner.succeed();
      }
    ],
    "unbox:cleaningTempFiles:start": [
      function () {
        if (this.quiet) {
          return;
        }
        this.spinners.cleanUpSpinner = new Spinner(
          "events:subscribers:unbox:cleanup",
          "Cleaning up temporary files"
        );
      }
    ],
    "unbox:cleaningTempFiles:succeed": [
      function () {
        if (this.quiet) {
          return;
        }
        this.spinners.cleanUpSpinner.succeed();
      }
    ],
    "unbox:settingUpBox:start": [
      function () {
        if (this.quiet) {
          return;
        }
        this.spinners.unboxHandlerSpinner = new Spinner(
          "events:subscribers:unbox:handler",
          "Setting up box"
        );
      }
    ],
    "unbox:settingUpBox:succeed": [
      function () {
        if (this.quiet) {
          return;
        }
        this.spinners.unboxHandlerSpinner.succeed();
      }
    ],
    "unbox:succeed": [
      function ({ boxConfig }) {
        if (this.quiet) {
          return;
        }
        this.logger.log(`${OS.EOL}Unbox successful, sweet!${OS.EOL}`);

        const commandMessages = formatCommands(boxConfig.commands);
        if (commandMessages.length > 0) {
          this.logger.log("Commands:" + OS.EOL);
        }

        commandMessages.forEach(message => this.logger.log(message));
        this.logger.log("");

        if (boxConfig.epilogue) {
          this.logger.log(boxConfig.epilogue.replace("\n", OS.EOL));
        }
      }
    ],
    "unbox:fail": [
      function () {
        if (this.quiet) {
          return;
        }
        Object.values(this.spinners).map(spinner => {
          if (spinner.isSpinning) {
            spinner.fail();
          }
        });
        this.logger.log("Unbox failed!");
      }
    ]
  }
};

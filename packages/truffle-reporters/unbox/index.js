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

module.exports = {
  initialization: function() {
    this.ora = ora;
  },
  handlers: {
    "unbox:startJob": function() {
      this.logger.log(`${OS.EOL}Starting unbox${OS.EOL}`);
    },
    "unbox:preparingToDownload:start": function() {
      this.spinner = this.ora("Preparing to download box").start();
    },
    "unbox:preparingToDownload:end": function() {
      this.spinner.succeed();
    },
    "unbox:downloadingBox:start": function() {
      this.spinner = this.ora("Downloading").start();
    },
    "unbox:downloadingBox:end": function() {
      this.spinner.succeed();
    },
    "unbox:cleaningTempFiles:start": function() {
      this.spinner = this.ora("cleaning up temporary files").start();
    },
    "unbox:cleaningTempFiles:end": function() {
      this.spinner.succeed();
    },
    "unbox:settingUpBox:start": function() {
      this.spinner = this.ora("Setting up box").start();
    },
    "unbox:settingUpBox:end": function() {
      this.spinner.succeed();
    },
    "unbox:jobFinished": function({ boxConfig }) {
      this.logger.log(`${OS.EOL}Unbox successful, sweet!${OS.EOL}`);

      const commandMessages = formatCommands(boxConfig.commands);
      if (commandMessages.length > 0) this.logger.log("Commands:" + OS.EOL);

      commandMessages.forEach(message => this.logger.log(message));
      this.logger.log("");

      if (boxConfig.epilogue) {
        this.logger.log(boxConfig.epilogue.replace("\n", OS.EOL));
      }
    },
    "unbox:jobFailed": function() {
      this.spinner.fail();
      this.logger.log("Unbox failed!");
    }
  }
};

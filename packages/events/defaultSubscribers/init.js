const OS = require("os");

module.exports = {
  initialization: function () {
    this.logger = console;
  },
  handlers: {
    "init:start": [
      function () {
        this.logger.log(`${OS.EOL}Starting init...`);
        this.logger.log(`================`);
      }
    ],
    "init:copyingProjectFiles": [
      function ({ destinationPath }) {
        this.logger.log(
          `${OS.EOL}> Copying project files to ${destinationPath}`
        );
      }
    ],
    "init:succeed": [
      function () {
        this.logger.log(`${OS.EOL}Init successful, sweet!${OS.EOL}`);
        this.logger.log(`Try our scaffold commands to get started:`);
        this.logger.log(
          "  $ truffle create contract YourContractName # scaffold a contract"
        );
        this.logger.log(
          "  $ truffle create test YourTestName         # scaffold a test"
        );
        this.logger.log(`${OS.EOL}http://trufflesuite.com/docs${OS.EOL}`);
      }
    ],
    "init:fail": [
      function ({ error }) {
        this.logger.log(`${OS.EOL}Something went wrong while copying files!`);
        this.logger.log(`${error}${OS.EOL}`);
      }
    ]
  }
};

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
      },
    ],
    "init:copyingProjectFiles": [
      function ({ destinationPath }) {
        this.logger.log(
          `${OS.EOL}> Copying project files to ${destinationPath}`
        );
      },
    ],
    "init:succeed": [
      function () {
        this.logger.log(`${OS.EOL}Init successful, sweet!${OS.EOL}`);
        this.logger.log(`"Why not ry truffle create contract HelloWorld and truffle create test HelloWorld to create a new contract and its associated test?"`);
      },
    ],
    "init:fail": [
      function ({ error }) {
        this.logger.log(`${OS.EOL}Something went wrong while copying files!`);
        this.logger.log(`${error}${OS.EOL}`);
      },
    ],
  },
};

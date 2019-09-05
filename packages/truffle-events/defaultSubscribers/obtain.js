const ora = require("ora");
const OS = require("os");

module.exports = {
  initialization: function() {
    this.logger = console;
    this.ora = ora;
  },
  handlers: {
    "obtain:start": [
      function() {
        this.logger.log(`${OS.EOL}Starting obtain...`);
        this.logger.log(`==================${OS.EOL}`);
      }
    ],
    "obtain:succeed": [
      function({ compiler }) {
        const { name, version } = compiler;
        this.logger.log(
          `    > successfully downloaded and cached version ${version} ` +
            `of the ${name} compiler.${OS.EOL}`
        );
      }
    ],
    "obtain:fail": [
      function() {
        if (this.spinner.isSpinning) this.spinner.fail();
        this.logger.log("Unbox failed!");
      }
    ],

    "downloadCompiler:start": [
      function({ attemptNumber }) {
        this.spinner = this.ora({
          text: `Downloading compiler. Attempt #${attemptNumber}.`,
          color: "red"
        });
      }
    ],
    "downloadCompiler:succeed": [
      function() {
        this.spinner.succeed();
      }
    ],

    "fetchSolcList:start": [
      function({ attemptNumber }) {
        this.spinner = this.ora({
          text: `Fetching solc version list from solc-bin. Attempt #${attemptNumber}`,
          color: "yellow"
        }).start();
      }
    ],
    "fetchSolcList:succeed": [
      function() {
        if (this.spinner.isSpinning) this.spinner.succeed();
      }
    ],
    "fetchSolcList:fail": [
      function() {
        if (this.spinner.isSpinning) this.spinner.fail();
      }
    ]
  }
};

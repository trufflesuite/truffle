const Spinner = require("@truffle/spinners").Spinner;
const OS = require("os");

module.exports = {
  initialization: function () {
    this.logger = console;
  },
  handlers: {
    "obtain:start": [
      function () {
        if (this.quiet) {
          return;
        }
        this.logger.log(`${OS.EOL}Starting obtain...`);
        this.logger.log(`==================${OS.EOL}`);
      }
    ],
    "obtain:succeed": [
      function ({ compiler }) {
        if (this.quiet) {
          return;
        }
        const { name, version } = compiler;
        this.logger.log(
          `    > successfully downloaded and cached version ${version} ` +
            `of the ${name} compiler.${OS.EOL}`
        );
      }
    ],
    "obtain:fail": [
      function () {
        if (this.quiet) {
          return;
        }

        this.spinner.fail();
        this.logger.log("Unbox failed!");
      }
    ],

    "downloadCompiler:start": [
      function ({ attemptNumber }) {
        if (this.quiet) {
          return;
        }
        this.downloadSpinner = new Spinner(
          "events:subscribers:obtain:download",
          {
            text: `Downloading compiler. Attempt #${attemptNumber}.`,
            prefixColor: "red"
          }
        );
      }
    ],
    "downloadCompiler:succeed": [
      function () {
        if (this.quiet) {
          return;
        }
        this.downloadSpinner.succeed();
      }
    ],
    "downloadCompiler:fail": [
      function () {
        if (this.quiet) {
          return;
        }
        this.downloadSpinner.fail();
      }
    ],
    "fetchSolcList:start": [
      function ({ attemptNumber }) {
        if (this.quiet) {
          return;
        }
        this.fetchSpinner = new Spinner("events:subscribers:obtain:fetch", {
          text: `Fetching solc version list from solc-bin. Attempt #${attemptNumber}`,
          prefixColor: "yellow"
        });
      }
    ],
    "fetchSolcList:succeed": [
      function () {
        if (this.quiet) {
          return;
        }
        this.fetchSpinner.succeed();
      }
    ],
    "fetchSolcList:fail": [
      function () {
        if (this.quiet) {
          return;
        }
        this.fetchSpinner.fail();
      }
    ]
  }
};

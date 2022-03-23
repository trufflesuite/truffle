const Spinner = require("@truffle/spinners").Spinner;

module.exports = {
  initialization: function (config) {
    this._logger = {
      log: ((...args) => {
        if (config.quiet) {
          return;
        }

        (this.logger || config.logger || console).log(...args);
      }).bind(this)
    };
  },
  handlers: {
    "rpc:request": [
      function (event) {
        const { payload } = event;
        if (payload.method === "eth_sendTransaction") {
          // TODO: Do we care about ID collisions?
          this.pendingTransactions[payload.id] = payload;

          this.spinner = new Spinner("events:subscribers:dashboard", {
            text: `Waiting for transaction signature. Please check your wallet for a transaction approval message.`
          });
        }
      }
    ],
    "rpc:result": [
      function (event) {
        const { payload, error, result } = event;

        if (payload.method === "eth_sendTransaction") {
          if (error) {
            const errMessage = `Transaction submission failed with error ${error.code}: '${error.message}'`;
            this.spinner.fail(errMessage);
          } else {
            this.spinner.succeed(`Transaction submitted successfully. Hash: ${result.result}`);
          }

          delete this.pendingTransactions[payload.id];
        }
      }
    ]
  }
};

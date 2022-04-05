const DashboardMessageBusClient = require("./client");
const Spinner = require("@truffle/spinners").Spinner;

module.exports = {
  initialization: function (config) {
    this.messageBus = new DashboardMessageBusClient(config);

    this.logger = this.logger || console;
    this.pendingTransactions = [];
  },
  handlers: {
    "compile:start": [
      async function () {
        await this.messageBus.sendAndAwait({
          type: "debug",
          payload: {
            message: "compile:start"
          }
        });
      }
    ],
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
        let { error } = event;
        const { payload, result } = event;

        if (payload.method === "eth_sendTransaction") {
          error = error || result.error;
          if (error) {
            const errMessage = `Transaction submission failed with error ${error.code}: '${error.message}'`;
            this.spinner.fail(errMessage);
          } else {
            this.spinner.remove();
          }

          delete this.pendingTransactions[payload.id];
        }
      }
    ]
  }
};

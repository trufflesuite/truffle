const Spinner = require("@truffle/spinners").Spinner;
const DashboardMessageBusClient = require("./client");

module.exports = {
  initialization: function (config) {
    this.messageBus = new DashboardMessageBusClient(config);

    this.logger = this.logger || console;
    this.pendingTransactions = [];
  },
  handlers: {
    "migrate:start": [
      async function (migrations) {
        console.log(migrations);
        await this.messageBus.sendAndAwait({
          type: "migrate",
          payload: {
            message: [`1_abc.js`, `2_xyz.js`]
          }
        });
      }
    ],
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
        if (!isDashboardNetwork(this.config)) {
          return;
        }

        const { payload } = event;
        if (payload.method === "eth_sendTransaction") {
          this.pendingTransactions[payload.id] = payload;

          this.spinner = new Spinner("events:subscribers:dashboard", {
            text: `Waiting for transaction signature. Please check your wallet for a transaction approval message.`
          });
        }
      }
    ],
    "rpc:result": [
      function (event) {
        if (!isDashboardNetwork(this.config)) {
          return;
        }

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

function isDashboardNetwork(config) {
  return config.network === "dashboard";
}

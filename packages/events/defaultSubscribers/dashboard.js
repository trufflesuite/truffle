const Spinner = require("@truffle/spinners").Spinner;
const {
  DashboardMessageBusClient
} = require("@truffle/dashboard-message-bus-client");

module.exports = {
  initialization: function (config) {
    const dashboardConfig = config.dashboard || {
      host: "localhost",
      port: 24012
    };

    this.messageBusClient = new DashboardMessageBusClient(dashboardConfig);

    this._logger = {
      log: ((...args) => {
        if (config.quiet) {
          return;
        }

        (this.logger || config.logger || console).log(...args);
      }).bind(this)
    };
    this.pendingTransactions = [];
  },
  handlers: {
    "compile:start": [
      async function () {
        if (!isDashboardNetwork(this.config)) return;

        try {
          const publishLifecycle = await this.messageBusClient.publish({
            type: "debug",
            payload: {
              message: "compile:start"
            }
          });
          publishLifecycle.abandon();
        } catch (err) {
          // best effort only, dashboard might not even be alive
        }
      }
    ],
    "compile:succeed": [
      async function ({ result }) {
        try {
          const publishLifecycle = await this.messageBusClient.publish({
            type: "cli-event",
            payload: {
              label: "workflow-compile-result",
              data: result
            }
          });
          publishLifecycle.abandon();
        } catch (err) {}
      }
    ],
    "rpc:request": [
      function (event) {
        if (!isDashboardNetwork(this.config)) return;

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
        if (!isDashboardNetwork(this.config)) return;

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

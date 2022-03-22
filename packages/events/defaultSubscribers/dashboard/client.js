const {
  connectToMessageBusWithRetries,
  createMessage,
  getMessageBusPorts,
  sendAndAwait
} = require("@truffle/dashboard-message-bus");

module.exports = class DashboardMessageBusClient {
  constructor(config) {
    this.ready = (async () => {
      const dashboard = config.dashboard || {
        host: "localhost",
        port: 24012
      };

      const { publishPort } = await getMessageBusPorts(
        dashboard.port,
        dashboard.host
      );

      return await connectToMessageBusWithRetries(publishPort, dashboard.host);
    })();
  }

  async sendAndAwait({ type, payload }) {
    const socket = await this.ready;
    const message = createMessage(type, payload);

    return await sendAndAwait(socket, message);
  }
};

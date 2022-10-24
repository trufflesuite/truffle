const Ganache = require("ganache");

module.exports = {
  servers: [],

  start: async function ({ port }) {
    if (!process.env.GETH) {
      const server = Ganache.server({
        gasLimit: 6721975,
        logging: {
          quiet: true
        },
        miner: {
          instamine: "strict"
        }
      });
      this.servers.push(server);
      if (port) {
        await server.listen(port);
      } else {
        await server.listen();
      }
    }
  },

  stop: async function () {
    if (this.servers.length > 0) {
      for (const server of this.servers) {
        await server.close();
      }
    }
  }
};

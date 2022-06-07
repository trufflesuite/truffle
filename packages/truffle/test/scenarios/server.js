const Ganache = require("ganache");
let server = null;

module.exports = {
  start: async function () {
    await this.stop();
    if (!process.env.GETH) {
      server = Ganache.server({
        gasLimit: 6721975,
        logging: {
          quiet: true
        },
        miner: {
          instamine: "strict"
        }
      });
      await server.listen(8545);
    }
  },

  stop: async function () {
    if (server) {
      await server.close();
      server = null;
    }
  }
};

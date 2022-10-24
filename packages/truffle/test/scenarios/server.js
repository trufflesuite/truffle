const Ganache = require("ganache");
const fs = require("fs-extra");
const glob = require("glob");
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
    await this.cleanUp();
  },

  cleanUp: function () {
    return new Promise((resolve, reject) => {
      glob("tmp-*", (err, files) => {
        if (err) reject(err);

        files.forEach(file => fs.removeSync(file));
        resolve();
      });
    });
  }
};

const Ganache = require("ganache");
const fs = require("fs-extra");
const glob = require("glob");

let server = null;

module.exports = {
  start: function (done) {
    this.stop(function () {
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
        server.listen(8545, done);
      } else {
        done();
      }
    });
  },
  stop: function (done) {
    const self = this;
    if (server) {
      server.close().then(function () {
        server = null;
        self.cleanUp().then(done);
      });
    } else {
      self.cleanUp().then(done);
    }
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

const TestRPC = require("ganache-cli");
const fs = require("fs-extra");
const glob = require("glob");

let server = null;

module.exports = {
  start(done) {
    this.stop(() => {
      if (!process.env.GETH) {
        server = TestRPC.server({ gasLimit: 6721975 });
        server.listen(8545, done);
      } else {
        done();
      }
    });
  },
  stop(done) {
    const self = this;
    if (server) {
      server.close(() => {
        server = null;
        self.cleanUp().then(done);
      });
    } else {
      self.cleanUp().then(done);
    }
  },
  cleanUp() {
    return new Promise((resolve, reject) => {
      glob("tmp-*", (err, files) => {
        if (err) reject(err);

        files.forEach(file => fs.removeSync(file));
        resolve();
      });
    });
  }
};

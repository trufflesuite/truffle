var TestRPC = require("ganache-cli");
var fs = require('fs-extra');
var glob = require('glob');

var server = null;

module.exports = {
  start: function(done) {
    this.stop(function(err) {
      if (!process.env.MAIN_REPO_CI || process.env.GANACHE){
        server = TestRPC.server({gasLimit: 6721975});
        server.listen(8545, done);
      } else {
        done();
      }
    });
  },
  stop: function(done) {
    var self = this;
    if (server) {
      server.close(function(err) {
        server = null;
        self.cleanUp().then(done);
      });
    } else {
      self.cleanUp().then(done);
    }
  },

  cleanUp: function() {
    return new Promise((resolve, reject) => {
      glob('tmp-*', (err, files) => {
        if(err) reject(err);

        files.forEach(file => fs.removeSync(file));
        resolve();
      })
    })
  },
}

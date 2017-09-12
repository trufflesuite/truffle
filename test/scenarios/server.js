var TestRPC = require("ethereumjs-testrpc");

var server = null;

module.exports = {
  start: function(done) {
    this.stop(function(err) {
      server = TestRPC.server();
      server.listen(8545, done);
    });
  },
  stop: function(done) {
    if (server) {
      server.close(function(err) {
        server = null;
        done(err);
      });
    } else {
      done();
    }
  }
}

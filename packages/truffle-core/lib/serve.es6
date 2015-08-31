var http = require('http');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');

var Serve = {
  start: function(config, done) {
    var serve = serveStatic(config.build.directory);

    var server = http.createServer(function(req, res) {
      var done = finalhandler(req, res);
      serve(req, res, done);
    });

    server.listen(8080);
    console.log("Serving app on port 8080...");
    done();
  }
};

module.exports = Serve;

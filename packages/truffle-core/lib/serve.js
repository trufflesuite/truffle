var http = require('http');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');

var Serve = {
  start: function(options, done) {
    var serve = serveStatic(options.build_directory);

    var server = http.createServer(function(req, res) {
      var done = finalhandler(req, res);
      serve(req, res, done);
    });

    var port = options.port || options.p || 8080;

    server.listen(port);
    console.log("Serving app on port " + port + "...");
    done();
  }
};

module.exports = Serve;

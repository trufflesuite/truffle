var http = require('http');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var spawn = require("child_process").spawn;

var Serve = {
  start: function(options, done) {
    var serve = serveStatic(options.build_directory);

    var server = http.createServer(function(req, res) {
      var done = finalhandler(req, res);
      serve(req, res, done);
    });

    var port = options.port || options.p || 8080;
    server.listen(port);
    done();

    var url = "http://localhost:" + port + "/";
    console.log("Serving app at " + url);
    spawn('open', [url]);
  }
};

module.exports = Serve;

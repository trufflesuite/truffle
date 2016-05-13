var fs = require("fs");
var path = require("path");
var Module = require('module');
var vm = require('vm');
var requireNoCache = require("./require-nocache");

var Require = {
  // options.file: path to file to execute. Must be a module that exports a function.
  // options.args: arguments passed to the exported function within file. If a callback
  //   is not included in args, exported function is treated as synchronous.
  // options.context: Object containing any global variables you'd like set when this
  //   function is run.
  file: function(options, done) {
    var self = this;
    var file = options.file;
    options.context = options.context || {};

    fs.readFile(options.file, {encoding: "utf8"}, function(err, source) {
      if (err) return done(err);

      // Modified from here: https://gist.github.com/anatoliychakkaev/1599423
      var m = new Module(file);

      // Provide all the globals listed here: https://nodejs.org/api/globals.html
      var context = {
        Buffer: Buffer,
        __dirname: path.dirname(file),
        __filename: file,
        clearImmediate: clearImmediate,
        clearInterval: clearInterval,
        clearTimeout: clearTimeout,
        console: console,
        exports: exports,
        global: global,
        module: m,
        process: process,
        require: require,
        setImmediate: setImmediate,
        setInterval: setInterval,
        setTimeout: setTimeout,
      };

      // Now add contract names.
      Object.keys(options.context).forEach(function(key) {
        context[key] = options.context[key];
      });

      var old_cwd = process.cwd();
      var old_dirname = __dirname;

      var script = vm.createScript(source, file);
      script.runInNewContext(context);

      done(null, m.exports);
    });
  }
}

module.exports = Require;

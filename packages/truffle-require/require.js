var fs = require("fs");
var path = require("path");
var Module = require('module');
var vm = require('vm');
var originalrequire = require("original-require");
var expect = require("truffle-expect");
var Config = require("truffle-config");
var Web3 = require("web3");

// options.file: path to file to execute. Must be a module that exports a function.
// options.args: arguments passed to the exported function within file. If a callback
//   is not included in args, exported function is treated as synchronous.
// options.context: Object containing any global variables you'd like set when this
//   function is run.
var Require = {
  file: function(options, done) {
    var self = this;
    var file = options.file;

    expect.options(options, [
      "file"
    ]);

    options = Config.default().with(options);

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
        require: function(pkgPath) {
          // Ugh. Simulate a full require function for the file.
          pkgPath = pkgPath.trim();

          // If absolute, just require.
          if (path.isAbsolute(pkgPath)) {
            return originalrequire(pkgPath);
          }

          // If relative, it's relative to the file.
          if (pkgPath[0] == ".") {
            return originalrequire(path.join(path.dirname(file), pkgPath));
          } else {
            // Not absolute, not relative, must be a globally or locally installed module.

            // Try local first.
            // Here we have to require from the node_modules directory directly.

            var moduleDir = path.dirname(file);
            while (true) {
              try {
                return originalrequire(path.join(moduleDir, 'node_modules', pkgPath));
              } catch (e) {

              }
              var oldModuleDir = moduleDir;
              moduleDir = path.join(moduleDir, '..');
              if (moduleDir === oldModuleDir) {
                break;
              }
            }

            // Try global, and let the error throw.
            return originalrequire(pkgPath);
          }
        },
        artifacts: options.resolver,
        setImmediate: setImmediate,
        setInterval: setInterval,
        setTimeout: setTimeout,
      };

      // Now add contract names.
      Object.keys(options.context || {}).forEach(function(key) {
        context[key] = options.context[key];
      });

      var old_cwd = process.cwd();

      process.chdir(path.dirname(file));

      var script = vm.createScript(source, file);
      script.runInNewContext(context);

      process.chdir(old_cwd);

      done(null, m.exports);
    });
  },

  exec: function(options, done) {
    var self = this;

    expect.options(options, [
      "contracts_build_directory",
      "file",
      "resolver",
      "provider",
      "network",
      "network_id"
    ]);

    var web3 = new Web3();
    web3.setProvider(options.provider);

    self.file({
      file: options.file,
      context: {
        web3: web3
      },
      resolver: options.resolver
    }, function(err, fn) {
      if (err) return done(err);
      fn(done);
    });
  }
};

module.exports = Require;

var dir = require("node-dir");
var temp = require("temp");
var Config = require("../config");
var Test = require("../test");
var fs = require("fs");
var copy = require("../copy");

var command = {
  command: 'test',
  description: 'Run Mocha and Solidity tests',
  builder: {},
  run: function (options, done) {
    var config = Config.detect(options);
    config.network = "test";

    var files = [];

    if (options.file) {
      files = [options.file];
    } else if (options._.length > 0) {
      Array.prototype.push.apply(files, options._);
    }

    function getFiles(callback) {
      if (files.length != 0) {
        return callback(null, files);
      }

      dir.files(config.test_directory, callback);
    };

    getFiles(function(err, files) {
      files = files.filter(function(file) {
        return file.match(config.test_file_extension_regexp) != null;
      });

      temp.mkdir('test-', function(err, temporaryDirectory) {
        if (err) return done(err);

        function cleanup() {
          var args = arguments;
          // Ensure directory cleanup.
          temp.cleanup(function(err) {
            // Ignore cleanup errors.
            done.apply(null, args);
          });
        };

        function run() {
          Test.run(config.with({
            test_files: files,
            contracts_build_directory: temporaryDirectory
          }), cleanup);
        };

        // Copy all the built files over to a temporary directory, because we
        // don't want to save any tests artifacts. Only do this if the build directory
        // exists.
        fs.stat(config.contracts_build_directory, function(err, stat) {
          if (err) return run();

          copy(config.contracts_build_directory, temporaryDirectory, function(err) {
            if (err) return done(err);
            run();
          });
        });
      });
    });
  }
}

module.exports = command;

var command = {
  command: 'test',
  description: 'Run JavaScript and Solidity tests',
  builder: {},
  run: function (options, done) {
    var OS = require("os");
    var dir = require("node-dir");
    var temp = require("temp");
    var Config = require("truffle-config");
    var Artifactor = require("truffle-artifactor");
    var Develop = require("../develop");
    var Test = require("../test");
    var fs = require("fs");
    var copy = require("../copy");
    var Environment = require("../environment");

    var config = Config.detect(options);

    // if "development" exists, default to using that for testing
    if (!config.network && config.networks.development) {
      config.network = "development";
    }

    if (!config.network) {
      config.network = "test";
    }

    var ipcDisconnect;

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
      if (err) return done(err);

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
            if (ipcDisconnect) {
              ipcDisconnect();
            }
          });
        };

        function run() {
          // Set a new artifactor; don't rely on the one created by Environments.
          // TODO: Make the test artifactor configurable.
          config.artifactor = new Artifactor(temporaryDirectory);

          Test.run(config.with({
            test_files: files,
            contracts_build_directory: temporaryDirectory
          }), cleanup);
        };

        var environmentCallback = function(err) {
          if (err) return done(err);
          // Copy all the built files over to a temporary directory, because we
          // don't want to save any tests artifacts. Only do this if the build directory
          // exists.
          fs.stat(config.contracts_build_directory, function(err, stat) {
            if (err) return run();

            copy(config.contracts_build_directory, temporaryDirectory, function(err) {
              if (err) return done(err);

              config.logger.log("Using network '" + config.network + "'." + OS.EOL);

              run();
            });
          });
        }

        if (config.networks[config.network]) {
          Environment.detect(config, environmentCallback);
        } else {
          var ipcOptions = {
            network: "test"
          };

          var testrpcOptions = {
            host: "127.0.0.1",
            port: 7545,
            network_id: 4447,
            mnemonic: "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
            gasLimit: config.gas
          };

          Develop.connectOrStart(ipcOptions, testrpcOptions, function(started, disconnect) {
            ipcDisconnect = disconnect;
            Environment.develop(config, testrpcOptions, environmentCallback);
          });
        }
      });
    });
  }
}

module.exports = command;

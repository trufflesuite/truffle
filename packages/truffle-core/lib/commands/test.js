var command = {
  command: "test",
  description: "Run JavaScript and Solidity tests",
  builder: {
    "show-events": {
      describe: "Show all test logs",
      type: "boolean",
      default: false
    }
  },
  help: {
    usage:
      "truffle test [<test_file>] [--compile-all] [--network <name>] [--verbose-rpc]",
    options: [
      {
        option: "<test_file>",
        description:
          "Name of the test file to be run. Can include path information if the file " +
          "does not exist in the\n                    current directory."
      },
      {
        option: "--compile-all",
        description:
          "Compile all contracts instead of intelligently choosing which contracts need " +
          "to be compiled."
      },
      {
        option: "--network <name>",
        description:
          "Specify the network to use, using artifacts specific to that network. Network " +
          "name must exist\n                    in the configuration."
      },
      {
        option: "--verbose-rpc",
        description:
          "Log communication between Truffle and the Ethereum client."
      }
    ]
  },
  run: function(options, done) {
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

    // if "test" or "development" exists, default to use for testing
    // otherwise run a default "test" network
    if (!config.network) {
      config.networks.test
        ? (config.network = "test")
        : config.networks.development
          ? (config.network = "development")
          : (config.network = "test");
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
    }

    getFiles(function(err, files) {
      if (err) return done(err);

      files = files.filter(function(file) {
        return file.match(config.test_file_extension_regexp) != null;
      });

      temp.mkdir("test-", function(err, temporaryDirectory) {
        if (err) return done(err);

        function cleanup() {
          var args = arguments;
          // Ensure directory cleanup.
          temp.cleanup(function() {
            // Ignore cleanup errors.
            done.apply(null, args);
            if (ipcDisconnect) {
              ipcDisconnect();
            }
          });
        }

        function run() {
          // Set a new artifactor; don't rely on the one created by Environments.
          // TODO: Make the test artifactor configurable.
          config.artifactor = new Artifactor(temporaryDirectory);

          Test.run(
            config.with({
              test_files: files,
              contracts_build_directory: temporaryDirectory
            }),
            cleanup
          );
        }

        var environmentCallback = function(err) {
          if (err) return done(err);
          // Copy all the built files over to a temporary directory, because we
          // don't want to save any tests artifacts. Only do this if the build directory
          // exists.
          fs.stat(config.contracts_build_directory, function(err) {
            if (err) return run();

            copy(config.contracts_build_directory, temporaryDirectory, function(
              err
            ) {
              if (err) return done(err);

              config.logger.log(
                "Using network '" + config.network + "'." + OS.EOL
              );

              run();
            });
          });
        };

        let testrpcOptions;
        const hasNetworkConfig = config.networks[config.network];

        if (hasNetworkConfig) {
          testrpcOptions = config.networks[config.network];
        } else {
          testrpcOptions = {
            host: "127.0.0.1",
            port: 7545,
            network_id: 4447,
            mnemonic:
              "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
            gasLimit: config.gas,
            noVMErrorsOnRPCResponse: true
          };
        }

        Develop.connectOrStart(config, testrpcOptions, function(
          started,
          disconnect
        ) {
          ipcDisconnect = disconnect;
          if (hasNetworkConfig) {
            Environment.detect(config, environmentCallback);
          } else {
            Environment.develop(config, testrpcOptions, environmentCallback);
          }
        });
      });
    });
  }
};

module.exports = command;

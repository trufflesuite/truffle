const command = {
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
      "truffle test [<test_file>] [--compile-all] [--network <name>] [--verbose-rpc] [--show-events]",
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
      },
      {
        option: "--show-events",
        description: "Log all contract events."
      }
    ]
  },
  run: function(options, done) {
    const OS = require("os");
    const dir = require("node-dir");
    const temp = require("temp").track();
    const Config = require("truffle-config");
    const Artifactor = require("truffle-artifactor");
    const Test = require("../test");
    const fs = require("fs");
    const { promisify } = require("util");
    const promisifiedCopy = promisify(require("../copy"));
    const { Environment, Develop } = require("truffle-environment");

    const config = Config.detect(options);

    // if "development" exists, default to using that for testing
    if (!config.network && config.networks.development) {
      config.network = "development";
    }

    if (!config.network) {
      config.network = "test";
    } else {
      Environment.detect(config).catch(done);
    }

    let ipcDisconnect;
    let files = [];

    if (options.file) {
      files = [options.file];
    } else if (options._.length > 0) {
      Array.prototype.push.apply(files, options._);
    }

    try {
      if (files.length === 0) {
        files = dir.files(config.test_directory, { sync: true }) || [];
      }
    } catch (error) {
      return done(error);
    }

    files = files.filter(function(file) {
      return file.match(config.test_file_extension_regexp) != null;
    });

    let temporaryDirectory;
    try {
      temporaryDirectory = temp.mkdirSync("test-");
    } catch (error) {
      return done(error);
    }

    function runCallback() {
      var args = arguments;
      // Ensure directory cleanup.
      done.apply(null, args);
      if (ipcDisconnect) ipcDisconnect();
    }

    function run() {
      // Set a new artifactor; don't rely on the one created by Environments.
      // TODO: Make the test artifactor configurable.
      config.artifactor = new Artifactor(temporaryDirectory);

      const testConfig = config.with({
        test_files: files,
        contracts_build_directory: temporaryDirectory
      });
      Test.run(testConfig)
        .then(runCallback)
        .catch(runCallback);
    }

    const environmentCallback = function() {
      // Copy all the built files over to a temporary directory, because we
      // don't want to save any tests artifacts. Only do this if the build directory
      // exists.
      try {
        fs.statSync(config.contracts_build_directory);
      } catch (_error) {
        return run();
      }

      promisifiedCopy(config.contracts_build_directory, temporaryDirectory)
        .then(() => {
          config.logger.log("Using network '" + config.network + "'." + OS.EOL);

          run();
        })
        .catch(done);
    };

    if (config.networks[config.network]) {
      Environment.detect(config)
        .then(() => environmentCallback())
        .catch(done);
    } else {
      const ipcOptions = { network: "test" };

      const ganacheOptions = {
        host: "127.0.0.1",
        port: 7545,
        network_id: 4447,
        mnemonic:
          "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
        gasLimit: config.gas,
        noVMErrorsOnRPCResponse: true
      };
      Develop.connectOrStart(
        ipcOptions,
        ganacheOptions,
        (started, disconnect) => {
          ipcDisconnect = disconnect;
          Environment.develop(config, ganacheOptions)
            .then(() => environmentCallback())
            .catch(done);
        }
      );
    }
  }
};

module.exports = command;

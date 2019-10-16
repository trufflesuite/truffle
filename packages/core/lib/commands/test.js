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
    const Config = require("@truffle/config");
    const Artifactor = require("@truffle/artifactor");
    const Test = require("../test");
    const { Environment, Develop } = require("@truffle/environment");

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

    try {
      files = this.determineTestFilesToRun(options, config);
      files = files.filter(file => {
        return file.match(config.test_file_extension_regexp) !== null;
      });
    } catch (error) {
      return done(error);
    }

    function performCleanup() {
      if (ipcDisconnect) ipcDisconnect();
    }

    async function prepareConfigAndRunTests({ config, temporaryDirectory }) {
      // Set a new artifactor; don't rely on the one created by Environments.
      // TODO: Make the test artifactor configurable.
      config.artifactor = new Artifactor(temporaryDirectory);

      const testConfig = config.with({
        test_files: files,
        contracts_build_directory: temporaryDirectory
      });
      await Test.run(testConfig);
    }

    if (config.networks[config.network]) {
      Environment.detect(config)
        .then(() => this.copyArtifactsToTempDir(config))
        .then(prepareConfigAndRunTests)
        .then(() => performCleanup())
        .then(() => done())
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
        noVMErrorsOnRPCResponse: true,
        time: config.genesis_time
      };
      Develop.connectOrStart(
        ipcOptions,
        ganacheOptions,
        (started, disconnect) => {
          ipcDisconnect = disconnect;
          Environment.develop(config, ganacheOptions)
            .then(() => this.copyArtifactsToTempDir(config))
            .then(prepareConfigAndRunTests)
            .then(() => performCleanup())
            .then(() => done())
            .catch(done);
        }
      );
    }
  },

  copyArtifactsToTempDir: async config => {
    const temp = require("temp").track();
    const { promisify } = require("util");
    const copy = require("../copy");
    const fs = require("fs");
    const OS = require("os");
    // Copy all the built files over to a temporary directory, because we
    // don't want to save any tests artifacts. Only do this if the build directory
    // exists.
    const temporaryDirectory = temp.mkdirSync("test-");
    try {
      fs.statSync(config.contracts_build_directory);
    } catch (_error) {
      return { config, temporaryDirectory };
    }

    await promisify(copy)(config.contracts_build_directory, temporaryDirectory);
    config.logger.log("Using network '" + config.network + "'." + OS.EOL);
    return { config, temporaryDirectory };
  },

  determineTestFilesToRun: (options, config) => {
    const path = require("path");
    const fs = require("fs");
    const glob = require("glob");
    let files = [];
    if (options.file) {
      files = [options.file];
    } else if (options._.length > 0) {
      Array.prototype.push.apply(files, options._);
    }

    if (files.length === 0) {
      const directoryContents = glob.sync(
        `${config.test_directory}${path.sep}*`
      );
      files =
        directoryContents.filter(item => fs.statSync(item).isFile()) || [];
    }
    return files;
  }
};

module.exports = command;

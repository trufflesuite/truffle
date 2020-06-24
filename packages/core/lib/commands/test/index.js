const command = {
  command: "test",
  description: "Run JavaScript and Solidity tests",
  builder: {
    "show-events": {
      describe: "Show all test logs",
      type: "boolean",
      default: false
    },
    "debug": {
      describe: "Enable in-test debugging",
      type: "boolean",
      default: false
    },
    "debug-global": {
      describe: "Specify debug global function name",
      default: "debug"
    },
    "runner-output-only": {
      describe: "Suppress all output except for test runner output.",
      type: "boolean",
      default: false
    },
    "bail": {
      describe: "Bail after first test failure",
      type: "boolean",
      default: false
    }
  },
  help: {
    usage:
      "truffle test [<test_file>] [--compile-all] [--network <name>] [--verbose-rpc] [--show-events] [--debug] [--debug-global <identifier>] [--bail]",
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
      },
      {
        option: "--debug",
        description:
          "Provides global debug() function for in-test debugging. " +
          "JS tests only; implies --compile-all."
      },
      {
        option: "--debug-global <identifier>",
        description:
          'Specify global identifier for debug function. Default: "debug"'
      },
      {
        option: "--runner-output-only",
        description: "Suppress all output except for test runner output."
      },
      {
        option: "--bail",
        description: "Bail after first test failure"
      }
    ]
  },
  run: function(options, done) {
    const { sync: globSync } = require("glob");
    const { join: pathJoin } = require("path");
    const Config = require("@truffle/config");
    const { Environment, Develop } = require("@truffle/environment");
    const {
      copyArtifactsToTempDir,
      determineTestFilesToRun,
      prepareConfigAndRunTests
    } = require("./helpers");

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

    // enables in-test debug() interrupt, forcing compileAll
    if (config.debug) config.compileAll = true;

    let ipcDisconnect, files;
    try {
      const { file } = config;
      const inputArgs = config._;
      files = determineTestFilesToRun({
        config,
        inputArgs,
        inputFile: file
      });
      config._ = [];
    } catch (error) {
      return done(error);
    }

    if (config.networks[config.network]) {
      Environment.detect(config)
        .then(() => copyArtifactsToTempDir(config))
        .then(({ config, temporaryDirectory }) => {
          return prepareConfigAndRunTests({
            config,
            files,
            temporaryDirectory
          });
        })
        .then(numberOfFailures => {
          done.call(null, numberOfFailures);
        })
        .catch(done);
    } else {
      const ipcOptions = { network: "test" };
      let ganacheOptions;

      const TEZOS_PATTERN = "**/*.{ligo,mligo,religo,py}";
      const tezosProject = globSync(
        pathJoin(config.contracts_directory, TEZOS_PATTERN),
        { follow: true }
      );

      if (tezosProject.length) {
        ganacheOptions = {
          host: "127.0.0.1",
          port: 8732,
          network_id: "*",
          seed: "alice",
          flavor: "tezos"
        };
      } else {
        ganacheOptions = {
          host: "127.0.0.1",
          port: 7545,
          network_id: 4447,
          mnemonic:
            "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
          gasLimit: config.gas,
          time: config.genesis_time
        };
      }

      Develop.connectOrStart(ipcOptions, ganacheOptions)
        .then(({ disconnect }) => {
          ipcDisconnect = disconnect;
          return Environment.develop(config, ganacheOptions);
        })
        .then(() => copyArtifactsToTempDir(config))
        .then(({ config, temporaryDirectory }) => {
          return prepareConfigAndRunTests({
            config,
            files,
            temporaryDirectory
          });
        })
        .then(numberOfFailures => {
          done.call(null, numberOfFailures);
          ipcDisconnect();
        })
        .catch(done);
    }
  }
};

module.exports = command;

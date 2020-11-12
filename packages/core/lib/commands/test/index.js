const OS = require("os");
const command = {
  command: "test",
  description: "Run JavaScript and Solidity tests",
  builder: {
    "show-events": {
      describe: "Show all test logs",
      type: "boolean",
      default: false
    },
    "compile-all-debug": {
      describe: "Compile in debug mode",
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
      alias: "b",
      describe: "Bail after first test failure",
      type: "boolean",
      default: false
    },
    "stacktrace": {
      alias: "t",
      describe: "Produce Solidity stacktraces",
      type: "boolean",
      default: false
    },
    "stacktrace-extra": {
      describe: "Produce Solidity stacktraces and compile in debug mode",
      type: "boolean",
      default: false
    }
  },
  help: {
    usage:
      `truffle test [<test_file>] [--compile-all[-debug]] [--network <name>] [--compile-none]${OS.EOL}` +
      `                             ` + // spacing to align with previous line
      `[--show-events] [--debug] [--debug-global <identifier>] [--verbose-rpc]${OS.EOL}` +
      `                             ` + // spacing to align with previous line
      `[--bail] [--stacktrace[-extra]]`,
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
        option: "--compile-none",
        description: "Do not compile any contracts before running the tests"
      },
      {
        option: "--compile-all-debug",
        description:
          "Compile all contracts and do so in debug mode for extra revert info.  May " +
          "cause errors on large\n                    contracts."
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
        description: "Bail after first test failure.  Alias: -b"
      },
      {
        option: "--stacktrace",
        description:
          "Allows for mixed JS/Solidity stacktraces when a Truffle Contract transaction " +
          "or deployment\n                    reverts.  Does not apply to calls or gas estimates.  " +
          "Implies --compile-all.  Experimental.  Alias: -t"
      },
      {
        option: "--stacktrace-extra",
        description: "Shortcut for --stacktrace --compile-all-debug."
      }
    ]
  },
  run: async function (options) {
    const Config = require("@truffle/config");
    const {Environment, Develop} = require("@truffle/environment");
    const {copyArtifactsToTempDir} = require("./copyArtifactsToTempDir");
    const {determineTestFilesToRun} = require("./determineTestFilesToRun");
    const {prepareConfigAndRunTests} = require("./prepareConfigAndRunTests");

    const config = Config.detect(options);

    // if "development" exists, default to using that for testing
    if (!config.network && config.networks.development) {
      config.network = "development";
    }

    if (!config.network) {
      config.network = "test";
    } else {
      await Environment.detect(config);
    }

    if (config.stacktraceExtra) {
      config.stacktrace = true;
      config.compileAllDebug = true;
    }
    // enables in-test debug() interrupt, or stacktraces, forcing compileAll
    if (config.debug || config.stacktrace || config.compileAllDebug) {
      config.compileAll = true;
    }

    const {file} = options;
    const inputArgs = options._;
    const files = determineTestFilesToRun({
      config,
      inputArgs,
      inputFile: file
    });

    if (config.networks[config.network]) {
      await Environment.detect(config);
      const {temporaryDirectory} = await copyArtifactsToTempDir(config);
      const numberOfFailures = await prepareConfigAndRunTests({
        config,
        files,
        temporaryDirectory
      });
      return numberOfFailures;
    } else {
      const ipcOptions = {network: "test"};
      const port = await require("get-port")();

      const ganacheOptions = {
        host: "127.0.0.1",
        port,
        network_id: 4447,
        mnemonic:
          "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
        gasLimit: config.gas,
        time: config.genesis_time
      };
      const {disconnect} = await Develop.connectOrStart(
        ipcOptions,
        ganacheOptions
      );
      const ipcDisconnect = disconnect;
      await Environment.develop(config, ganacheOptions);
      const {temporaryDirectory} = await copyArtifactsToTempDir(config);
      const {numberOfFailures} = await prepareConfigAndRunTests({
        config,
        files,
        temporaryDirectory
      });
      ipcDisconnect();
      return numberOfFailures;
    }
  }
};

module.exports = command;

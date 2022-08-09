const OS = require("os");

module.exports = {
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
    "grep": {
      alias: "g",
      type: "string",
      describe:
        `Use mocha's "grep" option while running tests. This ` +
        `option only runs tests that match the supplied regex/string.`
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
    },
    "reporter": {
      alias: "r",
      describe: "Specify the type of mocha reporter",
      default: undefined
    }
  },
  help: {
    usage:
      `truffle test [<test_file>] [--compile-all[-debug]] [--compile-none] ` +
      `[--migrate-none] ` +
      `[--network <name>]${OS.EOL}                             ` +
      `[--verbose-rpc] [--show-events] [--debug] ` +
      `[--debug-global <identifier>] [--bail|-b]${OS.EOL}                      ` +
      `       [--stacktrace[-extra]] [--grep|-g <regex>] ` +
      `[--reporter|-r <name>] `,
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
        option: "--migrate-none",
        description: "Do not migrate any contracts before running the tests."
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
        option: "--bail|-b",
        description: "Bail after first test failure."
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
      },
      {
        option: "--grep|-g",
        description:
          'Use mocha\'s "grep" option while running tests. This ' +
          "option only runs tests that match the supplied regex/string."
      },
      {
        option: "--reporter|-r <name>",
        description:
          "Specify the type of mocha reporter to use during testing. Default: 'spec'"
      }
    ],
    allowedGlobalOptions: ["network", "config"]
  }
};

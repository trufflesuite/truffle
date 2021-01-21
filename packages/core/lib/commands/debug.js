const OS = require("os");
const command = {
  command: "debug",
  description: "Interactively debug any transaction on the blockchain",
  builder: {
    "_": {
      type: "string"
    },
    "fetch-external": {
      describe: "Allow debugging of external contracts",
      alias: "x",
      type: "boolean",
      default: false
    },
    "compile-tests": {
      describe: "Allow debugging of Solidity test contracts",
      type: "boolean",
      default: false
    },
    "compile-all": {
      describe: "Force debugger to compile all contracts for extra safety",
      type: "boolean",
      default: false
    },
    "compile-none": {
      describe: "Force debugger to skip compilation (dangerous!)",
      type: "boolean",
      default: false
    }
  },
  help: {
    usage:
      "truffle debug [<transaction_hash>] [--network <network>] [--fetch-external]" + OS.EOL +
      "                             [--compile-tests|--compile-all|--compile-none]",
    options: [
      {
        option: "<transaction_hash>",
        description:
          "Transaction ID to use for debugging.  Mandatory if --fetch-external is passed."
      },
      {
        option: "--network",
        description: "Network to connect to."
      },
      {
        option: "--fetch-external",
        description:
          "Allows debugging of external contracts with verified sources.  Alias: -x"
      },
      {
        option: "--compile-tests",
        description:
          "Allows debugging of Solidity test contracts from the test directory.  Implies --compile-all."
      },
      {
        option: "--compile-all",
        description:
          "Forces the debugger to recompile all contracts even if it detects that it can use the artifacts."
      },
      {
        option: "--compile-none",
        description:
          "Forces the debugger to use artifacts even if it detects a problem.  Dangerous; may cause errors."
      }
    ]
  },
  run: async function (options) {
    const { promisify } = require("util");
    const debugModule = require("debug");
    const debug = debugModule("lib:commands:debug");

    const {Environment} = require("@truffle/environment");
    const Config = require("@truffle/config");

    const {CLIDebugger} = require("../debug");

    const config = Config.detect(options);
    await Environment.detect(config);

    const txHash = config._[0]; //may be undefined
    if (config.fetchExternal && txHash === undefined) {
      throw new Error(
        "Fetch-external mode requires a specific transaction to debug"
      );
    }
    if (config.compileTests) {
      config.compileAll = true;
    }
    if (config.compileAll && config.compileNone) {
      throw new Error(
        "Incompatible options passed regarding what to compile"
      );
    }
    const interpreter = await new CLIDebugger(config, {txHash}).run();
    return await promisify(interpreter.start).bind(interpreter.start)();
  }
};

module.exports = command;

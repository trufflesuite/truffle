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
    "force-recompile": {
      describe: "Force debugger to compile all contracts for extra safety",
      type: "boolean",
      default: false
    },
    "force-no-recompile": {
      describe: "Force debugger to skip compilation (dangerous!)",
      type: "boolean",
      default: false
    }
  },
  help: {
    usage:
      "truffle debug [--network <network>] [--fetch-external] [--compile-tests] [--force-[no-]recompile] [<transaction_hash>]",
    options: [
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
        option: "<transaction_hash>",
        description:
          "Transaction ID to use for debugging.  Mandatory if --fetch-external is passed."
      },
      {
        option: "--compile-tests",
        description:
          "Allows debugging of Solidity test contracts from the test directory.  Forces a recompile."
      },
      {
        option: "--force-recompile",
        description:
          "Forces the debugger to recompile all contracts even if it detects that it can use the artifacts."
      },
      {
        option: "--force-no-recompile",
        description:
          "Forces the debugger to use artifacts even if it detects a problem.  Dangerous; may cause errors."
      }
    ]
  },
  run: function(options, done) {
    const debugModule = require("debug");
    const debug = debugModule("lib:commands:debug");

    const { Environment } = require("@truffle/environment");
    const Config = require("@truffle/config");

    const { CLIDebugger } = require("../debug");

    Promise.resolve()
      .then(async () => {
        const config = Config.detect(options);
        await Environment.detect(config);

        const txHash = config._[0]; //may be undefined
        if (config.fetchExternal && txHash === undefined) {
          throw new Error(
            "Fetch-external mode requires a specific transaction to debug"
          );
        }
        if (config.compileTests) {
          config.forceRecompile = true;
        }
        if (config.forceRecompile && config.forceNoRecompile) {
          throw new Error(
            "Incompatible options passed regarding whether to recompile"
          );
        }
        return await new CLIDebugger(config, { txHash }).run();
      })
      .then(interpreter => interpreter.start(done))
      .catch(done);
  }
};

module.exports = command;

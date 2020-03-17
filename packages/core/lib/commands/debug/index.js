const command = {
  command: "debug",
  description:
    "Interactively debug any transaction on the blockchain (experimental)",
  builder: {
    _: {
      type: "string"
    }
  },
  help: {
    usage: "truffle debug [<transaction_hash>]",
    options: [
      {
        option: "<transaction_hash>",
        description: "Transaction ID to use for debugging."
      }
    ]
  },
  run: async function(options) {
    const debugModule = require("debug");
    const debug = debugModule("lib:commands:debug");

    const { CLIDebugger } = require("./cli");
    const { Environment } = require("@truffle/environment");
    const Config = require("@truffle/config");

    const config = Config.detect(options);
    await Environment.detect(config);

    const txHash = config._[0]; //may be undefined
    const interpreter = await new CLIDebugger(config).run(txHash);
    return interpreter.start();
  }
};

module.exports = command;

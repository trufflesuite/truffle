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
    }
  },
  help: {
    usage:
      "truffle debug [--network <network>] [--fetch-external] [<transaction_hash>]",
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
      }
    ]
  },
  run: async function (options) {
    const debugModule = require("debug");
    const debug = debugModule("lib:commands:debug");

    const { CLIDebugger } = require("./cli");
    const { Environment } = require("@truffle/environment");
    const Config = require("@truffle/config");

    const config = Config.detect(options);
    await Environment.detect(config);

    return Promise.resolve()
      .then(async () => {
        const config = Config.detect(options);
        await Environment.detect(config);

        const txHash = config._[0]; //may be undefined
        if (config.fetchExternal && txHash === undefined) {
          throw new Error(
            "Fetch-external mode requires a specific transaction to debug"
          );
        }
        return await new CLIDebugger(config, { txHash }).run();
      })
      .then(interpreter => interpreter.start(done))
      .catch(done);
  }
};

module.exports = command;

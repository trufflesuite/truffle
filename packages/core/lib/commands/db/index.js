const OS = require("os");
const serveCommand = require("./commands/serve");
const fetchCommand = require("./commands/fetch");

const usage =
  "truffle db <sub-command> [options]" +
  OS.EOL +
  OS.EOL +
  "  Available sub-commands: " +
  OS.EOL +
  OS.EOL +
  "  serve \tStart the GraphQL server" +
  OS.EOL +
  "  fetch \tFetch verified contracts from Etherscan and/or Sourcify" +
  OS.EOL +
  "  decode \tDecode transaction" +
  OS.EOL;

const command = {
  command: "db",
  description: "Database interface commands",
  builder: function (yargs) {
    return yargs
      .command(serveCommand)
      .command(fetchCommand)
      .demandCommand();
  },

  subCommands: {
    serve: {
      help: serveCommand.help,
      description: serveCommand.description
    },
    fetch: {
      help: fetchCommand.help,
      description: fetchCommand.description
    }
  },

  help: {
    usage,
    options: [
      ...serveCommand.help.options,
      ...fetchCommand.help.options,
    ]
  },

  run: async function (args) {
    const [subCommand] = args._;
    switch (subCommand) {
      case "serve":
        await serveCommand.run(args);
        break;

      case "fetch":
        await fetchCommand.run(args);
        break;

      default:
        console.log(`Unknown command: ${subCommand}`);
    }
  }
};

module.exports = command;

const OS = require("os");
const serveCommand = require("./commands/serve");

const usage =
  "truffle db <sub-command> [options]" +
  OS.EOL +
  OS.EOL +
  "  Available sub-commands: " +
  OS.EOL +
  OS.EOL +
  "  serve \tStart the GraphQL server" +
  OS.EOL;

const command = {
  command: "db",
  description: "Database interface commands",
  builder: function (yargs) {
    return yargs.commandDir("commands").demandCommand();
  },

  subCommands: {
    serve: {
      help: serveCommand.help,
      description: serveCommand.description
    }
  },

  help: {
    usage,
    options: []
  },

  run: async function (args) {
    const [subCommand] = args._;
    switch (subCommand) {
      case "serve":
        await serveCommand.run(args);
        break;

      default:
        console.log(`Unknown command: ${subCommand}`);
    }
  }
};

module.exports = command;

const OS = require("os");
const serveCommand = require("./commands/serve");
const queryCommand = require("./commands/query");

const usage =
  "truffle db <sub-command> [options]" +
  OS.EOL +
  "  Available sub-commands: " +
  OS.EOL +
  "                serve \tStart the GraphQL server";

const command = {
  command: "db",
  description: "Database interface commands",
  builder: function (yargs) {
    return yargs.command(serveCommand).demandCommand();
  },

  subCommands: {
    serve: {
      help: serveCommand.help,
      description: serveCommand.description
    },
    query: {
      help: queryCommand.help,
      description: queryCommand.description
    }
  },

  help: {
    usage,
    options: [],
    allowedGlobalOptions: []
  },

  run: async function (args) {
    const [subCommand] = args._;
    switch (subCommand) {
      case "serve":
        await serveCommand.run(args);
        break;

      case "query":
        await queryCommand.run(args);
        break;

      default:
        console.log(`Unknown command: ${subCommand}`);
    }
  }
};

module.exports = command;

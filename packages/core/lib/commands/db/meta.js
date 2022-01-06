const OS = require("os");
const serveCommand = require("./commands/serve");
const queryCommand = require("./commands/query");

const usage =
  "truffle db <sub-command> [options]" +
  OS.EOL +
  "  Available sub-commands: " +
  OS.EOL +
  "                serve \tStart the GraphQL server";

module.exports = {
  command: "db",
  description: "Database interface commands",
  builder: function (yargs) {
    return yargs
      .command({
        ...serveCommand.run,
        ...serveCommand.meta
      })
      .demandCommand();
  },

  subCommands: {
    serve: {
      help: serveCommand.help,
      description: serveCommand.meta
    },
    query: {
      help: queryCommand.help,
      description: queryCommand.meta
    }
  },

  help: {
    usage,
    options: [],
    allowedGlobalOptions: []
  }
};

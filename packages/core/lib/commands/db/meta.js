const OS = require("os");
const serveCommand = require("./commands/serve");
const queryCommand = require("./commands/query");

const usage =
  "truffle db <sub-command> [options]" +
  OS.EOL +
  "  Available sub-commands: " +
  OS.EOL +
  "                serve \tStart the GraphQL server" +
  OS.EOL +
  "                query \tQuery @truffle/db";

module.exports = {
  command: "db",
  description: "Database interface commands",
  builder: function (yargs) {
    return yargs
      .command({
        ...serveCommand.run,
        ...serveCommand.meta
      })
      .command({
        ...queryCommand.run,
        ...queryCommand.meta
      })
      .demandCommand();
  },

  subCommands: {
    serve: serveCommand.meta,
    query: queryCommand.meta
  },

  help: {
    usage,
    options: [],
    allowedGlobalOptions: []
  }
};

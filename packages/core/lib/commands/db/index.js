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
  OS.EOL;

const command = {
  command: "db",
  description: "Database interface commands",
  builder: function (yargs) {
    return yargs.commandDir("commands", { recurse: true }).demandCommand();
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
    options: [...serveCommand.help.options, ...fetchCommand.help.options]
  },

  run: function (args, done) {
    const [subCommand] = args._;
    switch (subCommand) {
      case "serve":
        serveCommand.run(args, done);
        break;

      case "fetch":
        fetchCommand.run(args, done);
        break;

      default:
        console.log(`Unknown command: ${subCommand}`);
        done();
    }
  }
};

module.exports = command;

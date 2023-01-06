const OS = require("os");

module.exports = {
  command: "help",
  description:
    "List all commands or provide information about a specific command",
  help: {
    usage:
      "truffle help [<command> <subCommand>]" +
      OS.EOL +
      "                truffle --help [<command> <subCommand>]" +
      OS.EOL +
      "                truffle [<command> <subCommand>] --help",
    options: [
      {
        option: "<command>",
        description: "Name of the command to display information for."
      }
    ],
    allowedGlobalOptions: []
  },
  builder: {}
};

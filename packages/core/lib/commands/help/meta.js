module.exports = {
  command: "help",
  description:
    "List all commands or provide information about a specific command",
  help: {
    usage: "truffle help [<command> [<subCommand>]]",
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

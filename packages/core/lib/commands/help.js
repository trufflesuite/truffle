const { callbackify } = require("util");

var command = {
  command: "help",
  description:
    "List all commands or provide information about a specific command",
  help: {
    usage: "truffle help [<command>]",
    options: [
      {
        option: "<command>",
        description: "Name of the command to display information for."
      }
    ]
  },
  builder: {},
  run: callbackify(async function(options) {
    var commands = require("./index");
    if (options._.length === 0) {
      await this.displayCommandHelp("help");
      return;
    }
    var selectedCommand = options._[0];

    if (commands[selectedCommand]) {
      await this.displayCommandHelp(selectedCommand);
      return;
    } else {
      console.log(`\n  Cannot find the given command '${selectedCommand}'`);
      console.log("  Please ensure your command is one of the following: ");
      Object.keys(commands)
        .sort()
        .forEach(command => console.log(`      ${command}`));
      console.log("");
      return;
    }
  }),
  displayCommandHelp: async selectedCommand => {
    var commands = require("./index");
    var commandHelp = commands[selectedCommand].help;

    if (typeof commandHelp === "function") {
      commandHelp = await commandHelp();
    }

    console.log(`\n  Usage:        ${commandHelp.usage}`);
    console.log(`  Description:  ${commands[selectedCommand].description}`);

    if (commandHelp.options.length > 0) {
      console.log(`  Options: `);
      commandHelp.options.forEach(option => {
        console.log(`                ${option.option}`);
        console.log(`                    ${option.description}`);
      });
    }
    console.log("");
  }
};

module.exports = command;

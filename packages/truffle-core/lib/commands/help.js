var command = {
  command: "help",
  description: "Display information about a given command",
  userHelp: {
    commandName: "help",
    usage: "truffle help <command>",
    parameters: [],
  },
  builder: {},
  run: function (options, callback) {
    var commands = require("./index");
    if (options._.length === 0) {
      this.printHelpInformation("help");
      return;
    }
    var selectedCommand = options._[0];

    if (commands[selectedCommand]) {
      this.printHelpInformation(selectedCommand);
    } else {
      console.log(`\n  Cannot find the given command '${selectedCommand}'`);
      console.log("  Please ensure your command is one of the following: ");
      Object.keys(commands).sort().forEach((command) => console.log(`      ${command}`))
      console.log("");
    }
  },
  printHelpInformation: function (selectedCommand) {
    var commands = require("./index");
    var commandHelp = commands[selectedCommand].userHelp;
    console.log(`\n  COMMAND NAME: ${commandHelp.commandName}`);
    console.log(`  USAGE:        ${commandHelp.usage}`);

    if (commandHelp.parameters.length > 0) {
      console.log(`  PARAMETERS: `);
      commandHelp.parameters.forEach((parameter) => console.log(`                ${parameter.parameter}: ${parameter.description}`));
    }
    console.log("");
  }
}

module.exports = command;

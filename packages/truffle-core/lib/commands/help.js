var command = {
  command: "help",
  description: "Display information about a given command",
  userHelp: {
    usage: "truffle help <command>",
    parameters: [],
  },
  builder: {},
  run: function (options, callback) {
    var commands = require("./index");
    if (options._.length === 0) {
      this.displayCommandHelp("help");
      return;
    }
    var selectedCommand = options._[0];

    if (commands[selectedCommand]) {
      this.displayCommandHelp(selectedCommand);
    } else {
      console.log(`\n  Cannot find the given command '${selectedCommand}'`);
      console.log("  Please ensure your command is one of the following: ");
      Object.keys(commands).sort().forEach((command) => console.log(`      ${command}`));
      console.log("");
    }
  },
  displayCommandHelp: function (selectedCommand) {
    var commands = require("./index");
    var commandHelp = commands[selectedCommand].userHelp;
    console.log(`  USAGE:        ${commandHelp.usage}`);
    console.log(`  DESCRIPTION:  ${commands[selectedCommand].description}`);

    if (commandHelp.parameters.length > 0) {
      console.log(`  PARAMETERS: `);
      commandHelp.parameters.forEach((parameter) => {
        console.log(`                ${parameter.parameter}: ${parameter.description}`);
      });
    }
    console.log("");
  }
}

module.exports = command;

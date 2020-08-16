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
  run: function (options, callback) {
    var commands = require("./index");
    if (options._.length === 0) {
      this.displayCommandHelp("help");
      return callback();
    }
    var selectedCommand = options._[0];
    var subCommand = options._[1];

    if (commands[selectedCommand]) {
      this.displayCommandHelp(selectedCommand, subCommand);
      return callback();
    } else {
      console.log(`\n  Cannot find the given command '${selectedCommand}'`);
      console.log("  Please ensure your command is one of the following: ");
      Object.keys(commands)
        .sort()
        .forEach(command => console.log(`      ${command}`));
      console.log("");
      return callback();
    }
  },
  displayCommandHelp: function (selectedCommand, subCommand) {
    let commands = require("./index");
    let commandHelp, commandDescription;

    const chosenCommand = commands[selectedCommand];

    if (subCommand && chosenCommand.subCommands[subCommand]) {
      commandHelp = chosenCommand.subCommands[subCommand].help;
      commandDescription = chosenCommand.subCommands[subCommand].description;
    } else {
      commandHelp = chosenCommand.help;
      commandDescription = chosenCommand.description;
    }

    console.log(`\n  Usage:        ${commandHelp.usage}`);
    console.log(`  Description:  ${commandDescription}`);

    if (commandHelp.options.length > 0) {
      console.log(`  Options: `);
      for (const option of commandHelp.options) {
        if (option.internal) {
          continue;
        }

        console.log(`                ${option.option}`);
        console.log(`                    ${option.description}`);
      }
    }
    console.log("");
  }
};

module.exports = command;

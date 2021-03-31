const command = {
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
  run: async function (options) {
    const commands = require("./index");
    if (options._.length === 0) {
      await this.displayCommandHelp("help", options);
      return;
    }
    const selectedCommand = options._[0];
    const subCommand = options._[1];

    if (commands[selectedCommand]) {
      await this.displayCommandHelp(selectedCommand, subCommand, options);
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
  },
  displayCommandHelp: async function (selectedCommand, subCommand, options) {
    const commands = require("./index");
    let commandHelp, commandDescription;

    const chosenCommand = commands[selectedCommand];

    if (subCommand && chosenCommand.subCommands[subCommand]) {
      commandHelp = chosenCommand.subCommands[subCommand].help;
      commandDescription = chosenCommand.subCommands[subCommand].description;
    } else {
      commandHelp = chosenCommand.help;
      commandDescription = chosenCommand.description;
    }

    if (typeof commandHelp === "function") {
      commandHelp = await commandHelp(options);
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

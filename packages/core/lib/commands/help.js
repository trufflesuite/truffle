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
    ],
    allowedGlobalOptions: []
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
    const commandOptions = require("../command-options");

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

    const allowedGlobalOptions = commandHelp.allowedGlobalOptions.filter(tag=> tag in commandOptions).map(tag => commandOptions[tag]);
    const validOptionsUsage = allowedGlobalOptions
      .map(({ option }) => `[${option}]`)
      .join(" ");

    const commandHelpUsage = commandHelp.usage + " " + validOptionsUsage;

    console.log(`\n  Usage:        ${commandHelpUsage}`);
    console.log(`  Description:  ${commandDescription}`);

    if (commandHelp.options.length > 0) {
      const allValidOptions = [...commandHelp.options, ...allowedGlobalOptions];

      console.log(`  Options: `);
      for (const option of allValidOptions) {
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

module.exports = async function (selectedCommand, subCommand, options) {
  const commands = require("../index");
  const globalCommandOptions = require("../../global-command-options");

  let commandHelp, commandDescription;

  const chosenCommand = commands[selectedCommand];

  if (subCommand && chosenCommand.meta.subCommands[subCommand]) {
    commandHelp = chosenCommand.meta.subCommands[subCommand].meta.help;
    commandDescription =
      chosenCommand.meta.subCommands[subCommand].meta.description;
  } else {
    commandHelp = chosenCommand.meta.help;
    commandDescription = chosenCommand.meta.description;
  }

  if (typeof commandHelp === "function") {
    commandHelp = await commandHelp(options);
  }

  const allowedGlobalOptions = commandHelp.allowedGlobalOptions
    .filter(tag => tag in globalCommandOptions)
    .map(tag => globalCommandOptions[tag]);
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
      if (option.hidden) {
        continue;
      }

      console.log(`                ${option.option}`);
      console.log(`                    ${option.description}`);
    }
  }
  console.log("");
};

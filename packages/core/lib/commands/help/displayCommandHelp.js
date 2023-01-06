module.exports = async function (selectedCommand, subCommand, options) {
  const commands = require("../index");
  const globalCommandOptions = require("../../global-command-options");
  const TruffleError = require("@truffle/error");

  let commandHelp, commandDescription;

  const inputStrings = process.argv.slice(2);

  const chosenCommand = commands[selectedCommand].meta;

  if (subCommand) {
    if (!chosenCommand.subCommands || !chosenCommand.subCommands[subCommand]) {
      throw new TruffleError(
        `"truffle ${inputStrings.join(" ")}" is an anvalid command`
      );
    }
    commandHelp = chosenCommand.subCommands[subCommand].help;
    commandDescription = chosenCommand.subCommands[subCommand].description;
  } else {
    commandHelp = chosenCommand.help;
    commandDescription = chosenCommand.description;
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

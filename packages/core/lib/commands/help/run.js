module.exports = async function (options) {
  const displayCommandHelp = require("./displayCommandHelp");
  const commands = require("../index");
  if (options._.length === 0) {
    await displayCommandHelp("help", options);
    return;
  }
  const selectedCommand = options._[0];
  const subCommand = options._[1];

  if (commands[selectedCommand]) {
    await displayCommandHelp(selectedCommand, subCommand, options);
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
};

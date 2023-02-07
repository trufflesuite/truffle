const handleHelpInput = function ({ inputStrings }) {
  // if no command was provided, display all available commands
  if (inputStrings.length === 0) {
    return { displayHelp: true };
  }
  // if only 'help' or '--help' was entered, display all available commands
  if (
    inputStrings.length === 1 &&
    (inputStrings[0] === "help" || inputStrings[0] === "--help")
  ) {
    return { displayHelp: true };
  }

  // if `--help` is in the input, assume the user wants help for the command
  // provided and transform the input into something the rest
  // of Truffle can handle
  const helpIndex = inputStrings.indexOf("--help");

  if (helpIndex !== -1) {
    //remove `--help` from array
    inputStrings.splice(helpIndex, 1);
    //insert `help` in first position
    inputStrings.unshift("help");
  }
  // let Truffle know whether to display the general help
  return { displayHelp: false };
};

module.exports = { handleHelpInput };

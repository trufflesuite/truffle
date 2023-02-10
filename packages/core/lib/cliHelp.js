const handleHelpInput = function ({ inputArguments }) {
  // we call slice to make a copy of the array so as not to mutate it
  const args = inputArguments.slice();
  // if no command was provided, display all available commands
  if (args.length === 0) {
    return {
      displayHelp: true,
      inputStrings: args
    };
  }
  // if only 'help' or '--help' was entered, display all available commands
  if (args.length === 1 && (args[0] === "help" || args[0] === "--help")) {
    return {
      displayHelp: true,
      inputStrings: args
    };
  }

  // if `--help` is in the input, assume the user wants help for the command
  // provided and transform the input into something the rest
  // of Truffle can handle
  const helpIndex = args.indexOf("--help");

  if (helpIndex !== -1) {
    //remove `--help` from array
    args.splice(helpIndex, 1);
    //insert `help` in first position
    args.unshift("help");
  }
  // let Truffle know whether to display the general help
  return {
    displayHelp: false,
    inputStrings: args
  };
};

module.exports = { handleHelpInput };

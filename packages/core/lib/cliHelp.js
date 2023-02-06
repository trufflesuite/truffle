const handleHelpInput = function ({ inputStrings }) {
  let displayHelp = false;
  //User only enter truffle with no commands, let's show them what's available.
  if (inputStrings.length === 0) {
    displayHelp = true;
  }
  // handle 'truffle help' and 'truffle --help'
  if (
    inputStrings.length === 1 &&
    (inputStrings[0] === "help" || inputStrings[0] === "--help")
  ) {
    displayHelp = true;
  }

  //if `--help` is in the input, validate and transform the input
  //in order to give the user help
  if (inputStrings.some(inputString => ["--help"].includes(inputString))) {
    //check where --help is used, mutate argument into something the rest
    //of Truffle can deal with
    const helpIndex = inputStrings.indexOf("--help");

    if (helpIndex !== -1) {
      //remove `--help` from array
      inputStrings.splice(helpIndex, 1);
      //insert `help` in first position
      inputStrings.unshift("help");
    }
  }
  // let Truffle know whether to display the general help
  return { displayHelp };
};

module.exports = { handleHelpInput };

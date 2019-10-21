// Regex for checking --option=value
const argTester = /--[a-zA-Z0-9]+[-]*[a-z0-9A-Z]*=[a-zA-Z0-9.-:]+/;

// Reformats the arguments --option=value to  --option value
const reformatArguments = inputArguments => {
  inputArguments.map((arg, i) => {
    // If arg is in form --option=value
    if (argTester.test(arg)) {
      if (arg.replace(argTester, "").length === 0) {
        let splittedArgs = arg.split("=");
        // Check if value=true then don't include the value  in inputArguments
        if (splittedArgs[1] === "true") {
          inputArguments.splice(i, 1, splittedArgs[0]);
        } else if (splittedArgs[1] === "false") {
          // if value is  false then remove that inputArguments
          inputArguments.splice(i, 1);
        } else {
          inputArguments.splice(i, 1, ...splittedArgs); // push down the splittedArgs
        }
      }
    }
  });
};

module.exports.reformatArguments = reformatArguments;

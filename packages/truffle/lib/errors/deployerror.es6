var colors = require("colors");
var ExtendableError = require("./extendableerror");

class DeployError extends ExtendableError {
  constructor(message, contract_name) {
    message = `Error deploying ${contract_name}:\n\n${message}\n\n` + colors.red("Deploy failed. See above.");
    super(message);
  }
}

module.exports = DeployError;

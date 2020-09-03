var colors = require("colors");
var TruffleError = require("@truffle/error");

class DeployError extends TruffleError {
  constructor(message, contract_name) {
    message =
      "Error deploying " +
      contract_name +
      ":\n\n" +
      message +
      "\n\n" +
      colors.red("Deploy failed. See above.");
    super(message);
  }
}

module.exports = DeployError;

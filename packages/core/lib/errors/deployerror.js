const colors = require("colors");
const { TruffleError } = require("@truffle/error");

class DeployError extends TruffleError {
  constructor(message, contract_name, options) {
    message =
      "Error deploying " +
      contract_name +
      ":\n\n" +
      message +
      "\n\n" +
      colors.red("Deploy failed. See above.");
    super(message, options);
  }
}

module.exports = DeployError;

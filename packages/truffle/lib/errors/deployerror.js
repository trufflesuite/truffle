var colors = require("colors");
var ExtendableError = require("./extendableerror");
var inherits = require("util").inherits;

inherits(DeployError, ExtendableError);

function DeployError(message, contract_name) {
  message = "Error deploying " + contract_name + ":\n\n" + message + "\n\n" + colors.red("Deploy failed. See above.");
  DeployError.super_.call(this, message);
}

module.exports = DeployError;

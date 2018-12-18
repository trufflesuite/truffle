const colors = require("colors");
const TruffleError = require("truffle-error");
const inherits = require("util").inherits;

inherits(BuildError, TruffleError);

function BuildError(message) {
  message = "Error building:\n\n" + message + "\n\n" + colors.red("Build failed. See above.");
  BuildError.super_.call(this, message);
}

module.exports = BuildError;

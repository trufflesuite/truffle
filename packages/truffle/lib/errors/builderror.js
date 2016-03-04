var colors = require("colors");
var ExtendableError = require("./extendableerror");
var inherits = require("util").inherits;

inherits(BuildError, ExtendableError);

function BuildError(message) {
  message = "Error building:\n\n" + message + "\n\n" + colors.red("Build failed. See above.");
  BuildError.super_.call(this, message);
}

module.exports = BuildError;

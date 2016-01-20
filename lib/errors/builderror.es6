var colors = require("colors");
var ExtendableError = require("./extendableerror");

class BuildError extends ExtendableError {
  constructor(message) {
    message = `Error building:\n\n${message}\n\n` + colors.red("Build failed. See above.");
    super(message);
  }
}

module.exports = BuildError;

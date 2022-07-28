const colors = require("colors");
const { TruffleError } = require("@truffle/error");

class BuildError extends TruffleError {
  constructor(message, options) {
    message =
      "Error building:\n\n" +
      message +
      "\n\n" +
      colors.red("Build failed. See above.");
    super(message, options);
  }
}

module.exports = BuildError;

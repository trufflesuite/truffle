const colors = require("colors");
const TruffleError = require("@truffle/error");

class BuildError extends TruffleError {
  constructor(message) {
    message =
      "Error building:\n\n" +
      message +
      "\n\n" +
      colors.red("Build failed. See above.");
    super(message);
  }
}

module.exports = BuildError;

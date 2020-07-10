const colors = require("colors");
const TruffleError = require("@truffle/error");

class CompileError extends TruffleError {
  constructor(message) {
    // Note we trim() because solc likes to add extra whitespace.
    const fancyMessage =
      message.trim() + "\n\n" + colors.red("Compilation failed. See above.");
    const normalMessage = message.trim();

    CompileError.super_.call(this, normalMessage);
    this.message = fancyMessage;
  }
}

module.exports = CompileError;

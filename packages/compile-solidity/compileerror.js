var colors = require("colors");
var TruffleError = require("@truffle/error");

class CompileError extends TruffleError {
  constructor(message) {
    // Note we trim() because solc likes to add extra whitespace.
    var fancy_message =
      message.trim() + "\n\n" + colors.red("Compilation failed. See above.");
    var normal_message = message.trim();

    super(normal_message);
    this.message = fancy_message; //?? I don't understand this, I just found it here
  }
}

module.exports = CompileError;

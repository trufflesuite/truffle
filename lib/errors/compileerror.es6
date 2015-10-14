var colors = require("colors");
var ExtendableError = require("./extendableerror");

class CompileError extends ExtendableError {
  constructor(message, file) {
    // Note we trim() because solc likes to add extra whitespace.
    message = `Error compiling ${file}:\n\n${message.trim()}\n` + colors.red("Compiliation failed. See above.");
    super(message);
  }
}

module.exports = CompileError;

var colors = require("colors");
var ExtendableError = require("./extendableerror");
var inherits = require("util").inherits;

inherits(CompileError, ExtendableError);

function CompileError(message, file) {
  if (file == null) {
    file = "";
  } else {
    file = " " + file;
  }

  // Note we trim() because solc likes to add extra whitespace.
  message = "Error compiling" + file + ":\n\n" + message.trim() + "\n" + colors.red("Compilation failed. See above.");
  CompileError.super_.call(this, message);
};

module.exports = CompileError;

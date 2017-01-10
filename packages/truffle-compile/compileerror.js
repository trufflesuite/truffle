var colors = require("colors");
var TruffleError = require("truffle-error");
var inherits = require("util").inherits;

inherits(CompileError, TruffleError);

function CompileError(message, file) {
  if (file == null) {
    file = "";
  } else {
    file = " " + file;
  }

  // Note we trim() because solc likes to add extra whitespace.
  message = "Error compiling" + file + ":\n\n" + message.trim() + "\n" + colors.red("Compiliation failed. See above.");
  CompileError.super_.call(this, message);
};

module.exports = CompileError;

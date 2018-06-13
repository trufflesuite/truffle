var colors = require("colors");
var TruffleError = require("truffle-error");
var inherits = require("util").inherits;

inherits(CompileError, TruffleError);

function CompileError(message) {
  // Note we trim() because solc likes to add extra whitespace.
  var fancy_message = message.trim() + "\n" + colors.red("Compilation failed. See above.");
  var normal_message = message.trim();

  CompileError.super_.call(this, normal_message);
  this.message = fancy_message;
};

module.exports = CompileError;

var ExtendableBuiltin = require("./extendablebuiltin");
var inherits = require("util").inherits;

inherits(ExtendableError, ExtendableBuiltin(Error));

// From: http://stackoverflow.com/questions/31089801/extending-error-in-javascript-with-es6-syntax
function ExtendableError(message) {
  ExtendableError.super_.call(this);
  this.message = message;
  this.stack = new Error(message).stack;
  this.name = this.constructor.name;
}

// Hack. Likely won't be formatted correctly when there are
// 10 or more errors. But if there's 10 or more errors, I'm guessing
// formatting won't matter so much.
ExtendableError.prototype.formatForMocha = function() {
  this.message = this.message.replace(/\n/g, "\n     ");
};

module.exports = ExtendableError;

var ExtendableBuiltin = require("../extendablebuiltin");

// From: http://stackoverflow.com/questions/31089801/extending-error-in-javascript-with-es6-syntax
class ExtendableError extends ExtendableBuiltin(Error) {
  constructor(message) {
    super();
    this.message = message;
    this.stack = (new Error()).stack;
    this.name = this.constructor.name;
  }

  // Hack. Likely won't be formatted correctly when there are
  // 10 or more errors. But if there's 10 or more errors, I'm guessing
  // formatting won't matter so much.
  formatForMocha() {
    this.message = this.message.replace(/\n/g, "\n     ");
  }
}

module.exports = ExtendableError;

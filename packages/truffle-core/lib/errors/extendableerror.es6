// From: http://stackoverflow.com/questions/31089801/extending-error-in-javascript-with-es6-syntax
class ExtendableError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.stack = (new Error()).stack;
    this.name = this.constructor.name;
  }
}

module.exports = ExtendableError;

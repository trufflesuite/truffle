const { TruffleError } = require("@truffle/error");

class TaskError extends TruffleError {
  constructor(message, options) {
    super(message, options);
  }
}

module.exports = TaskError;

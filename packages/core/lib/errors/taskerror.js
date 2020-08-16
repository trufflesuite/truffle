var TruffleError = require("@truffle/error");

class TaskError extends TruffleError {
  constructor(message) {
    super(message);
  }
}

module.exports = TaskError;

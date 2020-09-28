var TruffleError = require("@truffle/error");

class ConfigurationError extends TruffleError {
  constructor(message) {
    super(message);
  }
}

module.exports = ConfigurationError;

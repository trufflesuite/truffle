const { TruffleError } = require("@truffle/error");

class ConfigurationError extends TruffleError {
  constructor(message, options) {
    super(message, options);
  }
}

module.exports = ConfigurationError;

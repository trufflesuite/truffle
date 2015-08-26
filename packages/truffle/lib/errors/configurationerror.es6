var ExtendableError = require("./extendableerror");

class ConfigurationError extends ExtendableError {
  constructor(message) {
    super(message);
  }
}

module.exports = ConfigurationError;

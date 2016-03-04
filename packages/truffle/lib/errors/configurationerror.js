var ExtendableError = require("./extendableerror");
var inherits = require("util").inherits;

inherits(ConfigurationError, ExtendableError);

function ConfigurationError(message) {
    ConfigurationError.super_.call(this, message);
}

module.exports = ConfigurationError;

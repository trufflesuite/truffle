var inherits = require("util").inherits;
var TruffleError = require("truffle-error");

// HACK: string comparison seems to be only way to identify being unable to
// connect to RPC node.
var NOT_CONNECTED_MESSAGE = 'Invalid JSON RPC response: ""';

function ProviderError(message, error) {
  if (message == NOT_CONNECTED_MESSAGE) {
    message = "Could not connect to your Ethereum client. " +
      "Please check that your Ethereum client:\n" +
      "    - is running\n" +
      "    - is accepting RPC connections (i.e., \"--rpc\" option is used in geth)\n" +
      "    - is accessible over the network\n" +
      "    - is properly configured in your Truffle configuration file (truffle.js)\n";
  }
  ProviderError.super_.call(this, message);
  this.message = message;
}

inherits(ProviderError, TruffleError);

module.exports = ProviderError;

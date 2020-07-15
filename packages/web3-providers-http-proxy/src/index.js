const Web3HttpProvider = require("web3-providers-http");
const defaultAdaptor = require("./util").defaultAdaptor;
const ethToConflux = require("./ethToConflux");
const debug = require("debug")("provider-proxy");

class Web3HttpProviderProxy extends Web3HttpProvider {
  constructor(host, options) {
    super(host, options);
    this.chainAdaptor = options.chainAdaptor || defaultAdaptor;
  }

  send(payload, callback) {
    const adapted = this.chainAdaptor(payload);
    const superSend = super.send.bind(this);

    const wrappedCallback = function(err, result) {
      if (err) console.trace(err);

      if (result.error && result.error.message) {
        let errData = result.error.data;
        result.error.message += `\n> raw rpc payload is: ${JSON.stringify(
          payload
        )}`;
        result.error.message += errData ? `\n> error data: ${errData}` : "";
      }
      callback(err, result);
    };

    const execute = function(_adapted) {
      if (_adapted.adaptedSend) {
        _adapted.adaptedSend(superSend, payload, wrappedCallback);
        return;
      }

      superSend(_adapted.adaptedPayload, function(err, result) {
        debug(`Send RPC:`, _adapted.adaptedPayload);

        let adaptorResult = result && _adapted.adaptedOutputFn(result);
        debug("adaptor rpc response:", adaptorResult);

        if (adaptorResult.error && adaptorResult.error.message) {
          adaptorResult.error.message += `\n> adapted payload is: ${JSON.stringify(
            _adapted.adaptedPayload
          )}`;
        }
        debug("adaptorResult:", adaptorResult);
        wrappedCallback(err, adaptorResult);
      });
    };

    if (adapted.then) {
      adapted.then(execute).catch(wrappedCallback);
    } else {
      try {
        execute(adapted);
      } catch (err) {
        wrappedCallback(err);
      }
    }
  }
}

module.exports = {
  HttpProvider: Web3HttpProviderProxy,
  ethToConflux
};

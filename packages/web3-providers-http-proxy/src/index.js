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
    let supersend = super.send.bind(this);

    if (adapted.then) adapted.then(execute);
    else execute(adapted);

    function execute(_adapted) {
      supersend(_adapted.adaptedPayload, function(err, result) {
        debug(`Send RPC:`, _adapted.adaptedPayload);
        if (err) {
          callback(err);
        } else {
          let adaptorResult = _adapted.adaptedOutputFn(result);
          debug("adaptor rpc response:", adaptorResult);
          callback(null, adaptorResult);
        }
      });
    }
  }
}

module.exports = {
  HttpProvider: Web3HttpProviderProxy,
  ethToConflux
};

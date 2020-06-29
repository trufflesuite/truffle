const Web3HttpProvider = require("web3-providers-http");
const defaultAdaptor = require("./util").defaultAdaptor;
const ethToConflux = require("./ethToConflux");

class Web3HttpProviderProxy extends Web3HttpProvider {
  constructor(host, options) {
    super(host, options);
    this.chainAdaptor = options.chainAdaptor || defaultAdaptor;
  }

  send(payload, callback) {
    const adaptFn = this.chainAdaptor(payload);
    super.send(payload, function(err, result) {
      if (err) {
        callback(err);
      } else {
        callback(null, adaptFn(result));
      }
    });
  }
}

module.exports = {
  HttpProvider: Web3HttpProviderProxy,
  ethToConflux
};

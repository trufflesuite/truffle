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
    // const self = this;
    super.send(payload, function(err, response) {
      console.log(
        `RPC method: ${payload.method}, params: ${JSON.stringify(
          payload.params,
          null,
          "\t"
        )}`
      );
      if (err) {
        callback(err);
      } else {
        callback(null, adaptFn(response));
      }
    });
  }
}

module.exports = {
  HttpProvider: Web3HttpProviderProxy,
  ethToConflux
};


const AxCoreParameters = [
  "param1",
  "param2"
];

class AxCorePayloadExtension {
  constructor(provider) {
    const _oldSend = provider.send;

    this.txPayloadExtensions = {};

    provider.send = (payload, callback) => {
      if (payload.method === "eth_getTransactionReceipt" && typeof this.txPayloadExtensions[payload.params[0]] !== "undefined") {
        // add payload extensions
        Object.assign(payload.params, this.txPayloadExtensions[payload.params[0]]);
        console.log(payload);
      }

      _oldSend.call(provider, payload, (...args) => {
        if (payload.method === "eth_sendTransaction" || payload.method === "eth_sendRawTransaction") {
          // we need to get the transaction hash for this
          const txHash = args[1].result;
          const extensions = this.txPayloadExtensions[txHash] = {};

          AxCoreParameters.forEach((key) => {
            if (typeof payload.params[0][key] !== "undefined") {
              extensions[key] = payload.params[0][key];
            }
          });
        }

        callback.apply(null, args);
      });
    };

    return provider;
  }
};

module.exports = AxCorePayloadExtension;

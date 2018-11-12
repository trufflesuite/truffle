require("./src/monkeyPatches.js");

const rpcDebug = require("debug")("SethProvider:RPC");
const ProviderEngine = require("web3-provider-engine");
const VmSubprovider = require("./src/subproviders/vm");
const RpcSubprovider = require("web3-provider-engine/subproviders/rpc.js");

class SethProvider {
  constructor(url) {
    this.engine = new ProviderEngine();

    // vm
    this.engine.addProvider(new VmSubprovider());

    // data source
    this.engine.addProvider(
      new RpcSubprovider({
        rpcUrl: url
      })
    );

    // start polling for blocks
    this.engine.start();
  }

  sendAsync(req, callback) {
    this.send(req, callback);
  }

  send(req, callback) {
    req = this._cleanUpHex(req);

    rpcDebug(
      "> " +
        JSON.stringify(req, null, 2)
          .split("\n")
          .join("\n> ")
    );
    this.engine.sendAsync(req, (err, res) => {
      rpcDebug(
        "< " +
          JSON.stringify(res, null, 2)
            .split("\n")
            .join("\n< ")
      );
      callback(err, res);
    });
  }

  stop() {
    this.engine.stop();
  }

  _cleanUpHex(req) {
    let stringified = JSON.stringify(req);

    if (/(0x[0-9a-fA-F]+)/.test(stringified)) {
      Array.prototype.forEach.call(
        /(0x[0-9a-fA-F]+)/.exec(stringified),
        match => {
          stringified = stringified.replace(match, match.toLowerCase());
        }
      );
      return JSON.parse(stringified);
    }
    return req;
  }
}

module.exports = SethProvider;

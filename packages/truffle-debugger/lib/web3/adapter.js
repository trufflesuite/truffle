import debugModule from "debug";

import Web3 from "web3";

const debug = debugModule("debugger:web3:adapter");

export default class Web3Adapter {
  constructor(provider) {
    this.web3 = new Web3(provider);
  }

  async getTrace(txHash) {
    return new Promise( (accept, reject) => {
      this.web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "debug_traceTransaction",
        params: [txHash, {}],
        id: new Date().getTime()
      }, (err, result) => {
        if (err) return reject(err);
        if (result.error) return reject(new Error(result.error.message));
        debug("result: %o", result);
        accept(result.result.structLogs);
      });
    });
  };

  async getTransaction(txHash) {
    return new Promise( (accept, reject) => {
      this.web3.eth.getTransaction(txHash, (err, tx) => {
        if (err) return reject(err);

        return accept(tx);
      });
    });
  };

  async getReceipt(txHash) {
    return new Promise( (accept, reject) => {
      this.web3.eth.getTransactionReceipt(txHash, (err, receipt) => {
        if (err) return reject(err);

        return accept(receipt);
      });
    });
  };

  /**
   * getDeployedCode - get the deployed code for an address from the client
   * @param  {String} address
   * @return {String}         deployedBinary
   */
  async getDeployedCode(address) {
    debug("getting deployed code for %s", address);
    return new Promise((accept, reject) => {
      this.web3.eth.getCode(address, (err, deployedBinary) => {
        if (err) debug("error: %o", err);
        if (err) return reject(err);
        debug("got deployed code for %s", address);
        accept(deployedBinary);
      });
    });
  };
}

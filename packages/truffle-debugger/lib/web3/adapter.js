import debugModule from "debug";
const debug = debugModule("debugger:web3:adapter");

import Web3 from "web3";

export default class Web3Adapter {
  constructor(provider) {
    this.web3 = new Web3(provider);
  }

  async getTrace(txHash) {
    return new Promise((accept, reject) => {
      this.web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "debug_traceTransaction",
          params: [txHash, {}],
          id: new Date().getTime()
        },
        (err, result) => {
          if (err) return reject(err);
          if (result.error) return reject(new Error(result.error.message));
          debug("result: %o", result);
          accept(result.result.structLogs);
        }
      );
    });
  }

  async getTransaction(txHash) {
    return await this.web3.eth.getTransaction(txHash);
  }

  async getReceipt(txHash) {
    return await this.web3.eth.getTransactionReceipt(txHash);
  }

  async getBlock(blockNumberOrHash) {
    return await this.web3.eth.getBlock(blockNumberOrHash);
  }

  /**
   * getDeployedCode - get the deployed code for an address from the client
   * @param  {String} address
   * @return {String}         deployedBinary
   */
  async getDeployedCode(address) {
    debug("getting deployed code for %s", address);
    return await this.web3.eth.getCode(address);
  }
}

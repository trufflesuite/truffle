import debugModule from "debug";

import { Context } from "../context";
import { nextStep } from "../selectors";

const debug = debugModule("debugger:web3");

export default class Web3Adapter {
  constructor(web3) {
    this.web3 = web3;
  }

  /**
   * getTransactionInfo - get the primary address, the trace, and whether the transaction
   * is a contract creation
   *
   * This will return the to address, if the transaction is made to an existing contract;
   * or else it will return the address of the contract created as a result of the transaction.
   *
   * @param  {String}   txHash   Hash of the transaction
   * @return {Object}            Primary address of the transaction
   */
  async getTransactionInfo(txHash) {
    var self = this;

    let trace = await this.getTrace(txHash);

    return new Promise(function(accept, reject) {
      self.web3.eth.getTransaction(txHash, function(err, tx) {
        if (err) return reject(err);

        // Maybe there's a better way to check for this.
        // Some clients return 0x0 when transaction is a contract creation.
        if (tx.to && tx.to != "0x0") {
          return accept({
            trace: trace,
            address: tx.to
          });
        }

        self.web3.eth.getTransactionReceipt(txHash, function(err, receipt) {
          if (err) return reject(err);

          if (receipt.contractAddress) {
            return accept({
              trace: trace,
              binary: receipt.input
            });
          }

          return reject(new Error("Could not find contract associated with transaction. Please make sure you're debugging a transaction that executes a contract function or creates a new contract."));
        });
      });
    });
  };

  async getTrace(txHash) {
    var self = this;
    return new Promise(function(accept, reject) {
      self.web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "debug_traceTransaction",
        params: [txHash],
        id: new Date().getTime()
      }, function(err, result) {
        if (err) return reject(err);
        accept(result.result.structLogs);
      });
    });
  };

  async gatherContexts(trace, primaryAddress) {
    var self = this;
    // Analyze the trace and create contexts for each address.
    var addresses = {};

    trace.forEach(function(step, index) {
      if (step.op == "CALL" || step.op == "DELEGATECALL") {
        let address = step.stack[step.stack.length - 2]
        address = "0x" + address.substring(24);

        addresses[address] = true;
      }
    });

    if (primaryAddress) {
      addresses[primaryAddress] = true;
    }

    debug("addresses: %O", addresses);

    var promises = Object.keys(addresses).map(async function(address) {
      let deployedBinary = await self.getDeployedCode(address);
      return new Context(deployedBinary, {address})
    });

    return await Promise.all(promises);
  };

  /**
   * getDeployedCode - get the deployed code for an address from the client
   * @param  {String} address
   * @return {String}         deployedBinary
   */
  async getDeployedCode(address) {
    var self = this;

    return new Promise(function(accept, reject) {
      self.web3.eth.getCode(address, function(err, deployedBinary) {
        if (err) return reject(err);
        accept(deployedBinary);
      });
    });
  };
}

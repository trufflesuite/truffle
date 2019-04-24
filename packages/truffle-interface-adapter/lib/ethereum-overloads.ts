import BN from "bn.js";
import Web3 from "web3";

// The ts-ignores are ignoring the checks that are
// saying that web3.eth.getBlock is a function and doesn't
// have a `method` property, which it does

export function getBlock(web3: Web3) {
  // @ts-ignore
  const _oldFormatter = web3.eth.getBlock.method.outputFormatter;

  // @ts-ignore
  web3.eth.getBlock.method.outputFormatter = block => {
    // @ts-ignore
    let result = _oldFormatter.call(web3.eth.getBlock.method, block);

    // Perhaps there is a better method of doing this,
    // but the raw hexstrings work for the time being
    result.gasLimit = "0x" + new BN(result.gasLimit).toString(16);
    result.gasUsed = "0x" + new BN(result.gasUsed).toString(16);

    return result;
  };
};

export function getTransaction(web3: Web3) {
  const _oldTransactionFormatter =
    // @ts-ignore
    web3.eth.getTransaction.method.outputFormatter;

  // @ts-ignore
  web3.eth.getTransaction.method.outputFormatter = tx => {
    let result = _oldTransactionFormatter.call(
      // @ts-ignore
      web3.eth.getTransaction.method,
      tx
    );

    // Perhaps there is a better method of doing this,
    // but the raw hexstrings work for the time being
    result.gas = "0x" + new BN(result.gas).toString(16);

    return result;
  };
};

export function getTransactionReceipt(web3: Web3) {
  const _oldTransactionReceiptFormatter =
    // @ts-ignore
    web3.eth.getTransactionReceipt.method.outputFormatter;

  // @ts-ignore
  web3.eth.getTransactionReceipt.method.outputFormatter = receipt => {
    let result = _oldTransactionReceiptFormatter.call(
      // @ts-ignore
      web3.eth.getTransactionReceipt.method,
      receipt
    );

    // Perhaps there is a better method of doing this,
    // but the raw hexstrings work for the time being
    result.gasUsed = "0x" + new BN(result.gasUsed).toString(16);

    return result;
  };
};
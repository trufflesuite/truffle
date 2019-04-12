const BN = require("bn.js");

module.exports.getBlock = web3 => {
  const _oldFormatter = web3.eth.getBlock.method.outputFormatter;
  web3.eth.getBlock.method.outputFormatter = block => {
    let result = _oldFormatter.call(web3.eth.getBlock.method, block);

    // Perhaps there is a better method of doing this,
    // but the raw hexstrings work for the time being
    result.gasLimit = "0x" + new BN(result.gasLimit).toString(16);
    result.gasUsed = "0x" + new BN(result.gasUsed).toString(16);

    return result;
  };
};

module.exports.getTransaction = web3 => {
  const _oldTransactionFormatter =
    web3.eth.getTransaction.method.outputFormatter;
  web3.eth.getTransaction.method.outputFormatter = tx => {
    let result = _oldTransactionFormatter.call(
      web3.eth.getTransaction.method,
      tx
    );

    // Perhaps there is a better method of doing this,
    // but the raw hexstrings work for the time being
    result.gas = "0x" + new BN(result.gas).toString(16);

    return result;
  };
};

module.exports.getTransactionReceipt = web3 => {
  const _oldTransactionReceiptFormatter =
    web3.eth.getTransactionReceipt.method.outputFormatter;
  web3.eth.getTransactionReceipt.method.outputFormatter = receipt => {
    let result = _oldTransactionReceiptFormatter.call(
      web3.eth.getTransactionReceipt.method,
      receipt
    );

    // Perhaps there is a better method of doing this,
    // but the raw hexstrings work for the time being
    result.gasUsed = "0x" + new BN(result.gasUsed).toString(16);

    return result;
  };
};

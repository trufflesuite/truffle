const BN = require("bn.js");

module.exports.getBlock = web3 => {
  const _oldBlockFormatter = web3.eth.getBlock.method.outputFormatter;
  web3.eth.getBlock.method.outputFormatter = block => {
    const _oldTimestamp = block.timestamp;
    const _oldGasLimit = block.gasLimit;
    const _oldGasUsed = block.gasUsed;

    // Quorum uses nanoseconds instead of seconds in timestamp
    let timestamp = new BN(block.timestamp.slice(2), 16);
    timestamp = timestamp.div(new BN(10).pow(new BN(9)));
    block.timestamp = "0x" + timestamp.toString(16);

    // Since we're overwriting the gasLimit/Used later,
    // it doesn't matter what it is before the call
    // The same applies to the timestamp, but I reduced
    // the precision since there was an accurate representation
    // We do this because Quorum can have large block/transaction
    // gas limits
    block.gasLimit = "0x0";
    block.gasUsed = "0x0";

    let result = _oldBlockFormatter.call(web3.eth.getBlock.method, block);

    // Perhaps there is a better method of doing this,
    // but the raw hexstrings work for the time being
    result.timestamp = _oldTimestamp;
    result.gasLimit = _oldGasLimit;
    result.gasUsed = _oldGasUsed;

    return result;
  };
};

module.exports.getTransaction = web3 => {
  const _oldTransactionFormatter =
    web3.eth.getTransaction.method.outputFormatter;
  web3.eth.getTransaction.method.outputFormatter = tx => {
    const _oldGas = tx.gas;

    tx.gas = "0x0";

    let result = _oldTransactionFormatter.call(
      web3.eth.getTransaction.method,
      tx
    );

    // Perhaps there is a better method of doing this,
    // but the raw hexstrings work for the time being
    result.gas = _oldGas;

    return result;
  };
};

module.exports.getTransactionReceipt = web3 => {
  const _oldTransactionReceiptFormatter =
    web3.eth.getTransactionReceipt.method.outputFormatter;
  web3.eth.getTransactionReceipt.method.outputFormatter = receipt => {
    const _oldGasUsed = receipt.gasUsed;

    receipt.gasUsed = "0x0";

    let result = _oldTransactionReceiptFormatter.call(
      web3.eth.getTransactionReceipt.method,
      receipt
    );

    // Perhaps there is a better method of doing this,
    // but the raw hexstrings work for the time being
    result.gasUsed = _oldGasUsed;

    return result;
  };
};

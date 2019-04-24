import BN from "bn.js";
import Web3 from "web3";

// The ts-ignores are ignoring the checks that are
// saying that web3.eth.getBlock is a function and doesn't
// have a `method` property, which it does

export function getBlock(web3: Web3) {
  // @ts-ignore
  const _oldBlockFormatter = web3.eth.getBlock.method.outputFormatter;
  // @ts-ignore
  web3.eth.getBlock.method.outputFormatter = (block: any) => {
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

    // @ts-ignore
    let result = _oldBlockFormatter.call(web3.eth.getBlock.method, block);

    // Perhaps there is a better method of doing this,
    // but the raw hexstrings work for the time being
    result.timestamp = _oldTimestamp;
    result.gasLimit = _oldGasLimit;
    result.gasUsed = _oldGasUsed;

    return result;
  };
};

export function getTransaction(web3: Web3) {
  const _oldTransactionFormatter =
    // @ts-ignore
    web3.eth.getTransaction.method.outputFormatter;

  // @ts-ignore
  web3.eth.getTransaction.method.outputFormatter = (tx: any) => {
    const _oldGas = tx.gas;

    tx.gas = "0x0";

    let result = _oldTransactionFormatter.call(
      // @ts-ignore
      web3.eth.getTransaction.method,
      tx
    );

    // Perhaps there is a better method of doing this,
    // but the raw hexstrings work for the time being
    result.gas = _oldGas;

    return result;
  };
};

export function getTransactionReceipt(web3: Web3) {
  const _oldTransactionReceiptFormatter =
    // @ts-ignore
    web3.eth.getTransactionReceipt.method.outputFormatter;

  // @ts-ignore
  web3.eth.getTransactionReceipt.method.outputFormatter = (receipt: any) => {
    const _oldGasUsed = receipt.gasUsed;

    receipt.gasUsed = "0x0";

    let result = _oldTransactionReceiptFormatter.call(
      // @ts-ignore
      web3.eth.getTransactionReceipt.method,
      receipt
    );

    // Perhaps there is a better method of doing this,
    // but the raw hexstrings work for the time being
    result.gasUsed = _oldGasUsed;

    return result;
  };
};
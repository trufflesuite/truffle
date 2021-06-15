import BN from "bn.js";
import type { Web3Shim } from "..";
import type {
  BlockType,
  EvmTransaction,
  EvmTransactionReceipt
} from "../../adapter/types";

export const EthereumDefinition = {
  async initNetworkType(web3: Web3Shim) {
    // truffle has started expecting gas used/limit to be
    // hex strings to support bignumbers for other ledgers
    overrides.getBlock(web3);
    overrides.getTransaction(web3);
    overrides.getTransactionReceipt(web3);
  }
};

const overrides = {
  // The ts-ignores are ignoring the checks that are
  // saying that web3.eth.getBlock is a function and doesn't
  // have a `method` property, which it does
  getBlock: (web3: Web3Shim) => {
    // @ts-ignore
    const _oldFormatter = web3.eth.getBlock.method.outputFormatter;

    // @ts-ignore
    web3.eth.getBlock.method.outputFormatter = (block: BlockType) => {
      // @ts-ignore
      let result = _oldFormatter.call(web3.eth.getBlock.method, block);

      // Perhaps there is a better method of doing this,
      // but the raw hexstrings work for the time being
      result.gasLimit = "0x" + new BN(result.gasLimit).toString(16);
      result.gasUsed = "0x" + new BN(result.gasUsed).toString(16);

      return result;
    };
  },

  getTransaction: (web3: Web3Shim) => {
    const _oldTransactionFormatter =
      // @ts-ignore
      web3.eth.getTransaction.method.outputFormatter;

    // @ts-ignore
    web3.eth.getTransaction.method.outputFormatter = (tx: EvmTransaction) => {
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
  },

  getTransactionReceipt: (web3: Web3Shim) => {
    const _oldTransactionReceiptFormatter =
      // @ts-ignore
      web3.eth.getTransactionReceipt.method.outputFormatter;

    // @ts-ignore
    web3.eth.getTransactionReceipt.method.outputFormatter = (
      receipt: EvmTransactionReceipt
    ) => {
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
  }
};

import type { Web3Shim } from "..";
import type {
  BlockType,
  EvmTransaction,
  EvmTransactionReceipt
} from "../../adapter/types";
import { ETH_DATA_FORMAT } from "web3-types";

export const EthereumDefinition = {
  async initNetworkType(web3: Web3Shim) {
    // truffle has started expecting gas used/limit to be
    // hex strings to support bignumbers for other ledgers
    overrides.getBlock(web3);
    overrides.getTransaction(web3);
    overrides.getTransactionReceipt(web3);
  }
};

//todo web3js-migration get feedback on that, seems to duplicate stuff. Maybe we need just formatters
const overrides = {
  // The ts-ignores are ignoring the checks that are
  // saying that web3.eth.getBlock is a function and doesn't
  // have a `method` property, which it does
  getBlock: (web3: Web3Shim) => (block: BlockType) =>
    web3.eth.getBlock(block, false, ETH_DATA_FORMAT),
  getTransaction: (web3: Web3Shim) => (tx: EvmTransaction) =>
    web3.eth.getTransaction(tx.hash, ETH_DATA_FORMAT),

  getTransactionReceipt: (web3: Web3Shim) => (receipt: EvmTransactionReceipt) =>
    web3.eth.getTransactionReceipt(receipt.transactionHash, ETH_DATA_FORMAT)
};

import { Web3InterfaceAdapter, Web3InterfaceAdapterOptions } from "./web3";
import {
  NetworkId,
  Block,
  BlockType,
  Transaction,
  TransactionReceipt,
  TxHash
} from "./types";

// type union of supported network types
type InterfaceAdapterOptions = Web3InterfaceAdapterOptions;

const getNetworkTypeClass = (networkType = "ethereum") => {
  const supportedEvmNetworks = ["ethereum", "fabric-evm", "quorum"];

  if (supportedEvmNetworks.includes(networkType)) return "evm-like";
  return networkType;
};

export interface InterfaceAdapter {
  getNetworkId(): Promise<NetworkId>;
  getBlock(block: BlockType): Promise<Block>;
  getTransaction(tx: TxHash): Promise<Transaction>;
  getTransactionReceipt(tx: TxHash): Promise<TransactionReceipt>;
  getBalance(address: string): Promise<string>;
}

export const createInterfaceAdapter = (
  options: InterfaceAdapterOptions
): InterfaceAdapter => {
  const { networkType } = options;

  switch (getNetworkTypeClass(networkType)) {
    case "evm-like": {
      const { provider } = options;

      return new Web3InterfaceAdapter({
        networkType: networkType,
        provider: provider
      });
    }
    default:
      throw Error(`Sorry, "${networkType}" is not supported at this time.`);
  }
};

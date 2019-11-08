import {
  Web3InterfaceAdapter,
  Web3InterfaceAdapterOptions
} from "./web3-interface-adapter";
import {
  NetworkId,
  Block,
  BlockType,
  Transaction,
  TransactionReceipt,
  TxHash
} from "./interface-adapter/types";
import { Provider } from "@truffle/provider";

export interface InterfaceAdapterOptions extends Web3InterfaceAdapterOptions {}

const supportedEvmNetworks = ["ethereum", "fabric-evm", "quorum"];

const getNetworkTypeClass = ({
  networkType = "ethereum"
}: InterfaceAdapterOptions) => {
  if (supportedEvmNetworks.includes(networkType)) return "evm-like";
  return networkType;
};

export class InterfaceAdapter {
  public adapter: Web3InterfaceAdapter | any;
  constructor(options?: InterfaceAdapterOptions) {
    switch (getNetworkTypeClass(options)) {
      case "evm-like":
        this.adapter = new Web3InterfaceAdapter({
          provider: options.provider,
          networkType: options.networkType
        });
        break;
      default:
        throw Error(
          `Sorry, "${options.networkType}" is not supported at this time.`
        );
    }
    return this.adapter;
  }

  public getNetworkId(): Promise<NetworkId> {
    return this.adapter.getNetworkId();
  }

  public getBlock(block: BlockType): Promise<Block> {
    return this.adapter.getBlock(block);
  }

  public setProvider(provider: Provider): void {
    return this.adapter.setProvider(provider);
  }

  public getTransaction(tx: TxHash): Promise<Transaction> {
    return this.adapter.getTransaction(tx);
  }

  public getTransactionReceipt(tx: TxHash): Promise<TransactionReceipt> {
    return this.adapter.getTransactionReceipt(tx);
  }

  public getBalance(address: string): Promise<string> {
    return this.adapter.getBalance(address);
  }
}

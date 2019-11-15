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

const getNetworkTypeClass = (networkType = "ethereum") => {
  const supportedEvmNetworks = ["ethereum", "fabric-evm", "quorum"];

  if (supportedEvmNetworks.includes(networkType)) return "evm-like";
  return networkType;
};

const createAdapterForNetworkType = ({
  provider,
  networkType = "ethereum"
}: InterfaceAdapterOptions) => {
  switch (getNetworkTypeClass()) {
    case "evm-like":
      return new Web3InterfaceAdapter({
        provider: provider,
        networkType: networkType
      });
    default:
      throw Error(`Sorry, "${networkType}" is not supported at this time.`);
  }
};

export class InterfaceAdapter {
  public adapter: Web3InterfaceAdapter | any;

  private provider?: Provider;

  constructor(options?: InterfaceAdapterOptions) {
    this.provider = options.provider;

    this.setNetworkType(options.networkType);
  }

  public setNetworkType(networkType: InterfaceAdapterOptions["networkType"]) {
    this.adapter = createAdapterForNetworkType({
      networkType,
      provider: this.provider
    });
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

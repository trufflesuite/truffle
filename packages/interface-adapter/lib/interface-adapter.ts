import {
  Web3InterfaceAdapter,
  Web3InterfaceAdapterOptions
} from "./web3-interface-adapter";
import { TezosAdapter, TezosAdapterOptions } from "./tezos-adapter";
import { Block as EvmBlock } from "web3-eth";
import { Provider } from "@truffle/provider";

export type InterfaceAdapterOptions =
  | Web3InterfaceAdapterOptions
  | TezosAdapterOptions;
export type NetworkId = number | string;
export type Block = EvmBlock | any;
export type BlockType = number | string;

const supportedEvmNetworks = ["ethereum", "fabric-evm", "quorum"];

const getNetworkTypeClass = ({
  networkType = "ethereum"
}: InterfaceAdapterOptions) => {
  if (supportedEvmNetworks.includes(networkType)) return "evm-like";
  return networkType;
};

export class InterfaceAdapter {
  public adapter?: Web3InterfaceAdapter | TezosAdapter;
  constructor(options?: InterfaceAdapterOptions) {
    switch (getNetworkTypeClass(options)) {
      case "evm-like":
        this.adapter = new Web3InterfaceAdapter({
          provider: options.provider,
          networkType: options.networkType
        });
        break;
      case "tezos":
        this.adapter = new TezosAdapter({
          config: options.config,
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

  // @ts-ignore
  public setProvider(provider: Provider) {
    return this.adapter.setProvider(provider);
  }
}

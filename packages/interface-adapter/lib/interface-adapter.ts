import {
  Web3InterfaceAdapter,
  Web3InterfaceAdapterOptions
} from "./web3-interface-adapter";
import { Block as EvmBlock } from "web3-eth";
import { Provider } from "@truffle/provider";

export interface InterfaceAdapterOptions extends Web3InterfaceAdapterOptions {}
export type EvmBlockType = number | string;
export type NetworkId = Number | String;
export type Block = EvmBlock | any;
export type BlockType = EvmBlockType | any;

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

  public setProvider(provider: Provider) {
    return this.adapter.setProvider(provider);
  }
}

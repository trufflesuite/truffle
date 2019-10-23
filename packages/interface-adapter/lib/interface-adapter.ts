import { Web3Shim, Web3ShimOptions } from "./web3-shim";

export interface InterfaceAdapterOptions extends Web3ShimOptions {}
export type NetworkId = Number | String;
export type Block = Object;

const supportedEvmNetworks = ["ethereum", "fabric-evm", "quorum"];

const getNetworkTypeClass = ({
  networkType = "ethereum"
}: InterfaceAdapterOptions) => {
  if (supportedEvmNetworks.includes(networkType)) return "evm-like";
  return networkType;
};

export class InterfaceAdapter {
  public adapter?: Web3Shim | InterfaceAdapter;
  constructor(options?: InterfaceAdapterOptions) {
    switch (getNetworkTypeClass(options)) {
      case "evm-like":
        this.adapter = new Web3Shim({
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
}

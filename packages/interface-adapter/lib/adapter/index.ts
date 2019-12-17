import { Web3InterfaceAdapter, Web3InterfaceAdapterOptions } from "./web3";
import { TezosAdapter, TezosAdapterOptions } from "./tezos";

import { InterfaceAdapter } from "./types";

// type union of supported network types
export type InterfaceAdapterOptions =
  | Web3InterfaceAdapterOptions
  | TezosAdapterOptions;

const getNetworkTypeClass = (networkType = "ethereum") => {
  const supportedEvmNetworks = ["ethereum", "fabric-evm", "quorum", "web3js"];

  if (supportedEvmNetworks.includes(networkType)) return "evm-like";
  return networkType;
};

export const createInterfaceAdapter = (
  options: InterfaceAdapterOptions
): InterfaceAdapter => {
  const { provider, networkType } = options;

  switch (getNetworkTypeClass(networkType)) {
    case "evm-like": {
      return new Web3InterfaceAdapter({
        networkType,
        provider
      });
    }
    case "tezos": {
      return new TezosAdapter({
        provider
      });
    }
    default:
      throw Error(`Sorry, "${networkType}" is not supported at this time.`);
  }
};

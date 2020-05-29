import { Web3InterfaceAdapter } from "./web3";
import { TezosAdapter } from "./tezos";

import { InterfaceAdapter, InterfaceAdapterOptions } from "./types";

const getNetworkTypeClass = (networkType = "ethereum") => {
  const supportedEvmNetworks = ["ethereum", "fabric-evm", "quorum", "web3js"];

  if (supportedEvmNetworks.includes(networkType)) return "evm-like";
  return networkType;
};

export const createInterfaceAdapter = (
  options: InterfaceAdapterOptions
): InterfaceAdapter => {
  const { provider, networkType, config } = options;

  switch (getNetworkTypeClass(networkType)) {
    case "evm-like": {
      return new Web3InterfaceAdapter({
        networkType,
        provider
      });
    }
    case "tezos": {
      return new TezosAdapter({
        provider,
        config
      });
    }
    default:
      throw Error(`Sorry, "${networkType}" is not supported at this time.`);
  }
};

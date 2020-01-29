import { Web3InterfaceAdapter, Web3InterfaceAdapterOptions } from "./web3";

import { InterfaceAdapter } from "./types";

export type InterfaceAdapterOptions = Web3InterfaceAdapterOptions;

const getNetworkTypeClass = (networkType = "ethereum") => {
  const supportedEvmNetworks = ["ethereum", "fabric-evm", "quorum"];

  if (supportedEvmNetworks.includes(networkType)) return "evm-like";
  return networkType;
};

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

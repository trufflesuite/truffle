import Web3 from "web3";
import { Provider } from "web3/providers";

import { EthereumDefinition } from "./ethereum-overloads";
import { QuorumDefinition } from "./quorum-overloads";
import { FabricEvmDefinition } from "./fabric-evm-overloads";

const initInterface = async (interfaceAdapter: InterfaceAdapter) => {
  const networkTypes: NetworkTypesConfig = new Map(
    Object.entries({
      ethereum: EthereumDefinition,
      quorum: QuorumDefinition,
      "fabric-evm": FabricEvmDefinition
    })
  );

  networkTypes
    .get(interfaceAdapter.networkType)
    .initNetworkType(interfaceAdapter);
};

// March 13, 2019 - Mike Seese:
// This is a temporary shim to support the basic, Ethereum-based
// multiledger integration. This whole adapter, including this shim,
// will undergo better architecture before TruffleCon to support
// other non-Ethereum-based ledgers.

export type NetworkType = string;

export interface InterfaceAdapterOptions {
  provider?: Provider;
  networkType?: NetworkType;
}

export type InitNetworkType = (
  interfaceAdapter: InterfaceAdapter
) => Promise<void>;

export interface NetworkTypeDefinition {
  initNetworkType: InitNetworkType;
}

export type NetworkTypesConfig = Map<NetworkType, NetworkTypeDefinition>;

// March 14, 2019 - Mike Seese:
// This shim was intended to be temporary (see the above comment)
// with the idea of a more robust implementation. That implementation
// would essentially take this shim and include it under the
// ethereum/apis/web3 (or something like that) structure.
// I chose to extend/inherit web3 here to keep scope minimal for
// getting web3 to behave with Quorum and AxCore (future/concurrent PR).
// I wanted to do as little changing to the original Truffle codebase, and
// for it to still expect a web3 instance. Otherwise, the scope of these
// quick support work would be high. The "Web3Shim" is a shim for only
// web3.js, and it was not intended to serve as the general purpose
// truffle <=> all DLTs adapter. We have other commitments currently that
// should drive the development of the correct architecture of
// `@truffle/interface-adapter`that should use this work in a more
// sane and organized manner.
export class InterfaceAdapter extends Web3 {
  public networkType: NetworkType;

  constructor(options?: InterfaceAdapterOptions) {
    super();

    if (options) {
      this.networkType = options.networkType || "ethereum";

      if (options.provider) {
        this.setProvider(options.provider);
      }
    } else {
      this.networkType = "ethereum";
    }

    initInterface(this);
  }

  setNetworkType(networkType: NetworkType) {
    this.networkType = networkType;
    initInterface(this);
  }
}

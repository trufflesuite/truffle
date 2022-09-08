import Web3 from "web3";
import ethers from "ethers";
import type { provider as Web3Provider } from "web3-core/types";

import { EthereumDefinition } from "./overloads/ethereum";
import { QuorumDefinition } from "./overloads/quorum";
import { FabricEvmDefinition } from "./overloads/fabric-evm";
import { Web3JsDefinition } from "./overloads/web3js";
import { EthersDefinition } from "./overloads/ethers";

const initInterface = async (shim: Shim) => {
  const networkTypes: NetworkTypesConfig = new Map(
    Object.entries({
      web3js: Web3JsDefinition,
      ethers: EthersDefinition,
      ethereum: EthereumDefinition,
      quorum: QuorumDefinition,
      "fabric-evm": FabricEvmDefinition
    })
  );

  networkTypes.get(shim.networkType).initNetworkType(shim);
};

// July 28, 2022 - Kevin Weaver
// This has been augmented to allow for both Web3js and Ethers shims

export type Shim = Web3Shim | EthersShim;

export type NetworkType = string;

export interface ShimOptions {
  provider?: Web3Provider | EthersProvider;
  networkType?: NetworkType;
}

export type InitNetworkType = (web3Shim: Web3Shim) => Promise<void>;

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

//TODO move to web3js.ts?
export class Web3Shim extends Web3 {
  public networkType: NetworkType;

  constructor(options?: ShimOptions) {
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

  public setNetworkType(networkType: NetworkType) {
    this.networkType = networkType;
    initInterface(this);
  }
}

// TODO this should extend ethers
export class EthersShim extends ethers {
  public networkType: NetworkType;

  constructor(options?: ShimOptions) {
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

  public setNetworkType(networkType: NetworkType) {
    this.networkType = networkType;
    initInterface(this);
  }
}

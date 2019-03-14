import Web3 from "web3";
import { Provider } from "web3/providers";

import * as ethereumOverloads from "./ethereum-overloads";
import * as quorumOverloads from "./quorum-overloads";
import AxCoreProviderExtension, { AxCoreDeployOptions } from "./axcore-provider-extension";

// March 13, 2019 - Mike Seese:
// This is a temporary shim to support the basic, Ethereum-based
// multiledger integration. This whole adapter, including this shim,
// will undergo better architecture before TruffleCon to support
// other non-Ethereum-based ledgers.

export type NetworkType = "ethereum" | "quorum" | "axcore";

type DeployOptions = AxCoreDeployOptions;

export interface Web3ShimOptions {
  provider?: Provider;
  networkType?: NetworkType;
};

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
// `truffle-interface-adapter`that should use this work in a more
// sane and organized manner.
export default class Web3Shim extends Web3 {
  public networkType: NetworkType;

  constructor(options?: Web3ShimOptions) {
    super();

    if (options) {
      this.networkType = options.networkType || "ethereum";

      if (options.provider) {
        this.setProviderOverload(options.provider);
      }
    } else {
      this.networkType = "ethereum";
    }

    this.initInterface();
  }

  // Unfortunately cannot easily overload web3's
  // setProvider method due to how they initialize
  // it
  setProviderOverload(provider: Provider) {
    switch (this.networkType) {
      case "axcore": {
        provider = new AxCoreProviderExtension(provider);
        break;
      }
      case "quorum":
      case "ethereum":
      default: {
        break;
      }
    }

    this.setProvider(provider);
  }

  setNetworkType(networkType: NetworkType) {
    this.networkType = networkType;
    this.initInterface();
  }

  initInterface() {
    switch (this.networkType) {
      case "quorum": {
        this.initQuorum();
        break;
      }
      case "axcore":
      case "ethereum":
      default: {
        this.initEthereum();
        break;
      }
    }
  }

  initEthereum() {
    // truffle has started expecting gas used/limit to be
    // hex strings to support bignumbers for other ledgers
    ethereumOverloads.getBlock(this);
    ethereumOverloads.getTransaction(this);
    ethereumOverloads.getTransactionReceipt(this);
  }

  initQuorum() {
    // duck punch some of web3's output formatters
    quorumOverloads.getBlock(this);
    quorumOverloads.getTransaction(this);
    quorumOverloads.getTransactionReceipt(this);
  }

  hasContractOptions() {
    return this.networkType === "axcore";
  }

  registerNewContract(bytecode: string, options: DeployOptions) {
    // we're creating a new contract with this bytecode
    // we should watch for this bytecode, and process
    // options accordingly. once it's deployed, we can
    // associate an address to the options.
    switch (this.networkType) {
      case "axcore": {
        if (this.currentProvider instanceof AxCoreProviderExtension) {
          this.currentProvider.registerNewContract(bytecode, options);
        }
        break;
      }
      case "quorum":
      case "ethereum":
      default: {
        break;
      }
    }
  }
}

import BN from "bn.js";
import { ContractObject } from "truffle-contract-schema/spec";
import { Values } from "truffle-decode-utils";

interface EventVariable {
  name: string;
  type: string;
  value: string; //NOTE: this should change to be a decoded variable object
  //(although really that would replace EventVariable entirely)
};

export interface ContractState {
  name: string;
  balance: BN;
  nonce: BN;
  code: string;
  variables: {
    [name: string]: Values.Result
  };
};

export interface ContractEvent {
  logIndex: number;
  name: string;
  blockHash: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  variables: {
    [name: string]: EventVariable
  }
};

export interface ContractMapping {
  [nodeId: number]: ContractObject;
};

export interface StorageCache {
  [block: number]: {
    [address: string]: {
      [slot: string]: Uint8Array;
    };
  };
}

export interface CodeCache {
  [block: number]: {
    [address: string]: Uint8Array;
  };
}

export class ContractBeingDecodedHasNoNodeError extends Error {
  constructor() {
    const message = "Contract does not appear to have been compiled with Solidity (cannot locate contract node)";
    super(message);
    this.name = "ContractBeingDecodedHasNoNodeError";
  }
}

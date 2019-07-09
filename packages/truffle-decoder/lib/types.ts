import BN from "bn.js";
import { ContractObject } from "truffle-contract-schema/spec";
import { Values } from "truffle-codec-utils";
import { CalldataDecoding, LogDecoding } from "truffle-codec";
import { Transaction, BlockType } from "web3/eth/types";
import { Log } from "web3/types";

export interface ContractState {
  name: string;
  balance: BN;
  nonce: BN;
  code: string;
  variables: {
    [name: string]: Values.Result
  };
};

export interface DecodedTransaction extends Transaction {
  decoding: CalldataDecoding;
}

export interface DecodedLog extends Log {
  decodings: LogDecoding[];
}

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

export interface EventOptions {
  name?: string;
  fromBlock?: BlockType;
  toBlock?: BlockType;
  address?: string; //ignored by contract decoder!
}

export class ContractBeingDecodedHasNoNodeError extends Error {
  constructor() {
    const message = "Contract does not appear to have been compiled with Solidity (cannot locate contract node)";
    super(message);
    this.name = "ContractBeingDecodedHasNoNodeError";
  }
}

export class EventOrTransactionIsNotForThisContractError extends Error {
  thisAddress: string;
  decoderAddress: string;
  constructor(thisAddress: string, decoderAddress: string) {
    const message = "This event or transaction's address does not match that of the contract decoder";
    super(message);
    this.name = "EventOrTransactionIsNotForThisContractError";
    this.thisAddress = thisAddress;
    this.decoderAddress = decoderAddress;
  }
}

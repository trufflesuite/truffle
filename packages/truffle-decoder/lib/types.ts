import BN from "bn.js";
import { ContractObject } from "truffle-contract-schema/spec";
import { Values } from "truffle-decode-utils";
import { CalldataDecoding, EventDecoding } from "truffle-decoder-core";
import { Transaction, Log } from "web3-core";

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

export interface DecodedEvent extends Log {
  decoding: EventDecoding;
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

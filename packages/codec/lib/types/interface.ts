import BN from "bn.js";
import { ContractObject } from "@truffle/contract-schema/spec";
import { DecoderContext } from "./contexts";
import { AstDefinition } from "./ast";
import { Types, Values } from "@truffle/codec/format";
import { CalldataDecoding, LogDecoding } from "./decoding";
import { Transaction, BlockType } from "web3/eth/types";
import { Log } from "web3/types";

/**
 * This type represents the state of a contract aside from its storage.
 */
export interface ContractState {
  /**
   * The name of the contract.
   */
  name: string;
  /**
   * The contract's balance, in Wei, as a BN.
   */
  balanceAsBN: BN;
  /**
   * The contract's nonce, as a BN.
   */
  nonceAsBN: BN;
  /**
   * The contract's code, as a hexidecimal string.
   */
  code: string;
}

/**
 * This type represents one of the decoded contract's state variables.
 */
export interface DecodedVariable {
  /**
   * The name of the variable.  Note that due to inheritance, this may not be unique.
   */
  name: string;
  /**
   * The class of the contract that defined the variable, as a Types.ContractType.
   * Note that this class may differ from that of the contract being decoded, due
   * to inheritance.
   */
  class: Types.ContractType;
  /**
   * The decoded value of the variable.  Note this is a Values.Result, so it may be an error.
   */
  value: Values.Result;
}

/**
 * This type represents a web3 Transaction object that has been decoded.
 * Note that it extends the Transaction type and just adds an additional field
 * with the decoding.
 */
export interface DecodedTransaction extends Transaction {
  /**
   * The decoding of the transaction.  Note that transactions are not decoded in strict mode,
   * so there will always be a decoding, although it may contain errors.
   */
  decoding: CalldataDecoding;
}

/**
 * This type represents a web3 Log object that has been decoded.
 * Note that it extends the Log type and just adds an additional field
 * with the decoding.
 */
export interface DecodedLog extends Log {
  /**
   * An array of possible decodings of the given log -- it's an array because logs can be ambiguous.
   * Note that logs are decoded in strict mode, so (with one exception) none of the decodings should
   * contain errors; if a decoding would contain an error, instead it is simply excluded from the
   * list of possible decodings.  The one exception to this is that indexed parameters of reference
   * type cannot meaningfully be decoded, so those will decode to an error.
   *
   * If there are multiple possible decodings, they will always be listed in the following order:
   *
   * 1. A non-anonymous event coming from the contract itself (there can be at most one of these)
   * 2. Non-anonymous events coming from libraries
   * 3. Anonymous events coming from the contract itself
   * 4. Anonymous events coming from libraries
   *
   * You can check the kind and class.contractKind fields to distinguish between these.
   *
   * If no possible decodings are found, the list of decodings will be empty.
   *
   * Note that different decodings may use different decoding modes.
   */
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

export interface ContractAndContexts {
  contract: ContractObject;
  node: AstDefinition;
  deployedContext?: DecoderContext;
  constructorContext?: DecoderContext;
}

/**
 * The type of the options parameter to events().  This type will be expanded in the future
 * as more filtering options are added.
 */
export interface EventOptions {
  /**
   * If included, the name parameter will restrict to events with the given name.
   */
  name?: string;
  /**
   * The earliest block to include events from.  Defaults to "latest".
   */
  fromBlock?: BlockType;
  /**
   * The latest block to include events from.  Defaults to "latest".
   */
  toBlock?: BlockType;
  /**
   * If included, will restrict to events emitted by the given address.
   *
   * NOTE: In the contract instance decoder, if omitted, defaults to the
   * address of the contract instance being decoded, rather than not filtering
   * by address.  However, this behavior can be turned off by explicitly specifying
   * address as undefined.
   */
  address?: string;
}

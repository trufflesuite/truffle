import BN from "bn.js";
import { ContractObject } from "@truffle/contract-schema/spec";
import {
  Format,
  Ast,
  Contexts,
  CalldataDecoding,
  LogDecoding
} from "@truffle/codec";
import { Transaction, BlockType } from "web3/eth/types";
import { Log } from "web3/types";
import Web3 from "web3";

/**
 * This type represents the state of a contract aside from its storage.
 * @category Results
 */
export interface ContractState {
  /**
   * The contract's class, as a Format.Types.ContractType.
   */
  class: Format.Types.ContractType;
  /**
   * The contract's address, as a checksummed hex string.
   */
  address: string;
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
 * @category Results
 */
export interface StateVariable {
  /**
   * The name of the variable.  Note that due to inheritance, this may not be unique.
   */
  name: string;
  /**
   * The class of the contract that defined the variable, as a Format.Types.ContractType.
   * Note that this class may differ from that of the contract being decoded, due
   * to inheritance.
   */
  class: Format.Types.ContractType;
  /**
   * The decoded value of the variable.  Note this is a Format.Values.Result, so it may be an error.
   */
  value: Format.Values.Result;
}

/**
 * This type represents a web3 Log object that has been decoded.
 * Note that it extends the Log type and just adds an additional field
 * with the decoding.
 * @category Results
 */
export interface DecodedLog extends Log {
  /**
   * An array of possible decodings of the given log -- it's an array because logs can be ambiguous.
   *
   * This field works just like the output of [[WireDecoder.decodeLog]], so see that for more
   * information.
   */
  decodings: LogDecoding[];
}

export interface ContractMapping {
  [nodeId: number]: ContractObject;
}

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
  node: Ast.AstNode;
  deployedContext?: Contexts.DecoderContext;
  constructorContext?: Contexts.DecoderContext;
}

/**
 * The type of the options parameter to events().  This type will be expanded in the future
 * as more filtering options are added.
 * @category Configurations
 */
export interface EventOptions {
  /**
   * If included, the name parameter will restrict to events with the given name.
   */
  name?: string;
  /**
   * The earliest block to include events from.  Defaults to "latest".
   * See [the web3 docs](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#id14)
   * for legal values.
   */
  fromBlock?: BlockType;
  /**
   * The latest block to include events from.  Defaults to "latest".
   * See [the web3 docs](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#id14)
   * for legal values.
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

//HACK
export interface ContractConstructorObject extends ContractObject {
  _json: ContractObject;
  web3: Web3;
}

//HACK
export interface ContractInstanceObject {
  constructor: ContractConstructorObject;
  address: string;
}

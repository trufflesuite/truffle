import BN from "bn.js";
import { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import {
  Format,
  Ast,
  Compilations,
  Contexts,
  CalldataDecoding,
  LogDecoding
} from "@truffle/codec";
import Web3 from "web3";

/**
 * This type represents information about a Truffle project that can be used to
 * construct and initialize a decoder for that project.  This information may
 * be passed in various ways; this type is given here as an interface rahter
 * than a union, but note that really you only need to include one of these
 * fields.  (The `compilations` field will be used if present, then `artifacts`
 * if not, etc.)  Additional, more convenient options for how to specify project
 * information are intended to be added in the future.
 * @category Inputs
 */
export interface ProjectInfo {
  /**
   * An list of compilations, as specified in codec; this method of specifying
   * a project is mostly intended for internal Truffle use for now, but you can
   * see the documentation of the Compilations type if you want to use it.
   */
  compilations?: Compilations.Compilation[];
  /**
   * A list of contract artifacts for contracts in the project.
   * Contract constructor objects may be substituted for artifacts, so if
   * you're not sure which you're dealing with, it's OK.
   */
  artifacts?: Artifact[];
}

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

export interface CompilationAndContract {
  compilation: Compilations.Compilation;
  contract: Compilations.Contract;
}

export interface ContractAndContexts {
  compilationId: string;
  contract: Compilations.Contract;
  node: Ast.AstNode;
  deployedContext?: Contexts.DecoderContext;
  constructorContext?: Contexts.DecoderContext;
}

export interface ContractInfo {
  compilation: Compilations.Compilation;
  contract: Compilations.Contract;
  artifact: Artifact;
  contractNode: Ast.AstNode;
  contractNetwork: string;
  contextHash: string;
}

/**
 * The type of the options parameter to events().  This type will be expanded in the future
 * as more filtering options are added.
 * @category Inputs
 */
export interface EventOptions {
  /**
   * If included, the name parameter will restrict to events with the given name.
   */
  name?: string;
  /**
   * The earliest block to include events from.  Defaults to "latest".
   */
  fromBlock?: BlockSpecifier;
  /**
   * The latest block to include events from.  Defaults to "latest".
   */
  toBlock?: BlockSpecifier;
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

/**
 * Contains information about a transaction.  Most of the fields have
 * been made optional; only those needed by the decoder have been made
 * mandatory.
 *
 * Intended to work like Web3's
 * [Transaction](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#eth-gettransaction-return)
 * type.
 * @category Inputs
 */
export interface Transaction {
  /**
   * The transaction hash as hex string.
   */
  hash?: string;
  /**
   * The nonce of the sender before this transaction was sent.
   */
  nonce?: number;
  /**
   * Hash of this transaction's block as hex string; null if pending.
   */
  blockHash?: string | null;
  /**
   * This transaction's block number; null if pending.
   */
  blockNumber: number | null;
  /**
   * Index of transaction in block; null if block is pending.
   */
  transactionIndex?: number | null;
  /**
   * Address of the sender (as checksummed hex string).
   */
  from?: string;
  /**
   * Address of the recipient (as checksummed hex string), or null for a
   * contract creation.
   */
  to: string | null;
  /**
   * Wei sent with this transaction, as numeric string.
   */
  value?: string;
  /**
   * Gas price for this transaction, as numeric string.
   */
  gasPrice?: string;
  /**
   * Gas provided by the sender, as numeric string.
   */
  gas?: string;
  /**
   * Data sent with the transaction, as hex string.
   */
  input: string;
}

/**
 * Contains information about a transaction.  Most of the fields have
 * been made optional; only those needed by the decoder have been made
 * mandatory.
 *
 * Intended to work like Web3's
 * [Log](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#eth-getpastlogs-return)
 * type.
 * @category Inputs
 */
export interface Log {
  /**
   * Address of the emitter (as checksummed hex string).
   */
  address: string;
  /**
   * The log's data section (as hex string).
   */
  data: string;
  /**
   * The log's topics; each is a hex string representing 32 bytes.
   */
  topics: string[];
  /**
   * Index of the log within the block.
   */
  logIndex?: number;
  /**
   * Index within the block of the emitting transaction; null if
   * block is pending.
   */
  transactionIndex?: number | null;
  /**
   * The emitting transaction's hash (as hex string).
   */
  transactionHash?: string;
  /**
   * The block hash (as hex string).  Null if pending.
   */
  blockHash?: string | null;
  /**
   * The block number.  Null if pending.
   */
  blockNumber: number | null;
}

/**
 * Specifies a block.  Can be given by number, or can be given via the
 * special strings "genesis", "latest", or "pending".
 *
 * Intended to work like Web3's
 * [BlockType](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#id14).
 *
 * *Warning*: Using "pending", while allowed, is not advised, as it may lead
 * to internally inconsistent results.  Use of "latest" is safe and will not
 * lead to inconsistent results from a single decoder call due to the decoder's
 * caching system, but pending blocks cannot be cached under this system, which
 * may cause inconsistencies.
 * @category Inputs
 */
export type BlockSpecifier = number | "genesis" | "latest" | "pending";

export type RegularizedBlockSpecifier = number | "pending";

//HACK
export interface ContractConstructorObject extends Artifact {
  _json: Artifact;
  web3: Web3;
}

//HACK
export interface ContractInstanceObject {
  constructor: ContractConstructorObject;
  address: string;
}

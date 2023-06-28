import type BN from "bn.js";
import type Web3 from "web3";
import type { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import type {
  Format,
  Ast,
  Compilations,
  LogDecoding,
  StateVariable,
  ExtrasAllowed,
  BlockSpecifier,
  RegularizedBlockSpecifier
} from "@truffle/codec";
import type { Provider } from "@truffle/encoder";

//StateVariable used to be defined here, so let's continue
//to export it
export { StateVariable, ExtrasAllowed, RegularizedBlockSpecifier };

/**
 * This type contains information needed to initialize the decoder.
 * @Category Inputs
 */
export interface DecoderSettings {
  /**
   * Information about the project or contracts being decoded.
   * This may come in several forms; see the type documentation for
   * more information.  The simplest way to use this to set it to
   * `{ artifacts: <array of artifacts in project> }`.
   *
   * This may be left out if an artifact or contract has been passed
   * in by some other means, in which case the decoder will be made
   * based purely on that single contract, but it's recommended to pass in
   * project info for all your contracts to get the decoder's full power.
   */
  projectInfo?: Compilations.ProjectInfo;
  /**
   * The provider for the decoder to use.  This is required when using a
   * provider-based constructor; otherwise an exception will be thrown.
   * If the decoder is initialized with a Truffle Contract-based constructor,
   * this is not expected to be passed.  If it is passed, it will override
   * the use of the given contract's provider.
   */
  provider?: Provider;
  /**
   * This field can be included to enable or disable ENS resolution (and, in
   * the future, reverse resolution) and specify how it should be performed.
   * If absent, ENS resolution will be performed using the decoder's usual
   * provider.
   */
  ens?: EnsSettings;
  /**
   * This field can be included to enable selector-based decoding, using a
   * selector directory (such as 4byte.directory) when other
   * decoding methods fail.
   */
  selectorDirectory?: SelectorDirectorySettings;
}

//WARNING: copypasted from @truffle/encoder!
/**
 * This type indicates settings to be used for ENS resolution (and, in the
 * future, reverse resolution).
 * @Category Inputs
 */
export interface EnsSettings {
  /**
   * The provider to use for ENS resolution; set this to `null` to disable
   * ENS resolution.  If absent, will default to the decoder's provider,
   * and ENS resolution will be enabled.
   */
  provider?: Provider | null;
  /**
   * The ENS registry address to use; if absent, will use the default one
   * for the current network.  If there is no default registry for the
   * current network, ENS resolution will be disabled.
   */
  registryAddress?: string;
}

/**
 * This type contains settings for the use of a selector directory
 * when other decoding methods fail.
 * @Category inputs
 */
export interface SelectorDirectorySettings {
  /**
   * Set this to true to enable selector-based decoding.
   */
  enabled?: boolean;
  /**
   * URL for the selector directory API endpoint.  It should conform to
   * the [4byte.directory API](https://www.4byte.directory/docs/) protocol.
   * Defaults to `"https://www.4byte.directory/api"`.
   */
  url?: string;
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
 * This type represents a web3 Log object that has been decoded.
 * Note that it extends the Log type.   The differences are:
 *
 *   1. It adds an additional field with the decodings;
 *   2. Some fields that in Log are allowed to be strings,
 *     here are specified as numbers.  (Because this type is
 *     for output and that type is for input.)
 * @category Results
 */
export interface DecodedLog extends Log {
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
   * The block number.  Null if pending.
   */
  blockNumber: number | null;
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

export interface ContractInfo {
  compilation: Compilations.Compilation;
  contract: Compilations.Contract;
  artifact: Artifact;
  contractNode: Ast.AstNode;
  contractNetwork: number;
  contextHash: string;
}

/**
 * The type of the options parameter to [[WireDecoder.events|events()]].  This type will be expanded in the future
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
  /**
   * Used to indicate whether "extra" event decodings -- event decodings from
   * non-library contracts other than the one that appears to have emitted
   * the event -- should be returned.  Defaults to `"off"`.
   */
  extras?: ExtrasAllowed;
  /**
   * Allows decodings that don't pass the re-encoding test.  Don't turn
   * this on unless you know what you're doing!
   */
  disableChecks?: boolean;
}

/**
 * The type of the options parameter to [[WireDecoder.decodeLog|decodeLog()]].
 * This type may be expanded in the future.
 * @category Inputs
 */
export interface DecodeLogOptions {
  /**
   * Used to indicate whether "extra" event decodings -- event decodings from
   * non-library contracts other than the one that appears to have emitted
   * the event -- should be returned.  Defaults to `"off"`.
   */
  extras?: ExtrasAllowed;
  /**
   * Allows decodings that don't pass the re-encoding test.  Don't turn
   * this on unless you know what you're doing!
   */
  disableChecks?: boolean;
}

/**
 * The type of the options parameter to [[ContractDecoder.decodeReturnValue|decodeReturnValue()]].
 * @category Inputs
 */
export interface ReturnOptions {
  /**
   * The block in which the call was made.  Defaults to "latest".
   */
  block?: BlockSpecifier;
  /**
   * If included, tells the decoder to interpret the return data as
   * the return data from a successful call (if `true` is passed) or
   * as the return data from a failed call (if `false` is passed). If
   * omitted or set to `undefined`, the decoder will account for both
   * possibilities.
   */
  status?: boolean | undefined;
}

/**
 * Contains information about a transaction.  Most of the fields have
 * been made optional; only those needed by the decoder have been made
 * mandatory.
 *
 * Intended to work like Web3's
 * [Transaction](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#eth-gettransaction-return)
 * type, but with strings allowed where it requires numbers.
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
  nonce?: number | string | bigint;
  /**
   * Hash of this transaction's block as hex string; null if pending.
   */
  blockHash?: string | null;
  /**
   * This transaction's block number; null if pending.
   */
  blockNumber: number | string | bigint | null;
  /**
   * Index of transaction in block; null if block is pending.
   */
  transactionIndex?: number | string | bigint | null;
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
  /**
   * A positive unsigned 8-bit number between 0 and 0x7f that represents the type of the transaction.
   */
  type?: number | string | bigint;
  /**
   * The maximum fee per gas that the transaction is willing to pay in total.
   */
  maxFeePerGas?: string;
  /**
   * The maximum fee per gas to give miners to incentivize them to include the transaction (Priority fee).
   */
  maxPriorityFeePerGas?: string;
}

/**
 * Contains information about a transaction.  Most of the fields have
 * been made optional; only those needed by the decoder have been made
 * mandatory.
 *
 * Intended to work like Web3's
 * [Log](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#eth-getpastlogs-return)
 * type, but with strings allowed where it requires numbers.
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
  logIndex?: number | string | bigint;
  /**
   * Index within the block of the emitting transaction; null if
   * block is pending.
   */
  transactionIndex?: number | string | bigint | null;
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
  blockNumber: number | string | bigint | null;
}

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

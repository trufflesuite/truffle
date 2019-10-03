import BN from "bn.js";

import { Abi } from "@truffle/codec/types";
import { Types, Values } from "@truffle/codec/format";

/**
 * A type representing a transaction (calldata) decoding.  As you can see, these come in four types,
 * each of which is documented separately.
 */
export type CalldataDecoding =
  | FunctionDecoding
  | ConstructorDecoding
  | MessageDecoding
  | UnknownDecoding;

/**
 * A type representing a log (event) decoding.  As you can see, these come in two types, each of which
 * is documented separately.
 */
export type LogDecoding = EventDecoding | AnonymousDecoding;

/**
 * This is a type for recording what decoding mode a given decoding was produced in.  There are two
 * decoding modes, full mode and ABI mode.  In ABI mode, decoding is done purely based on the ABI JSON.
 * Full mode, by contrast, additionally uses AST information to produce a more informative decoding.
 * For more on full mode and ABI mode, see the README.
 */
export type DecodingMode = "full" | "abi";

/**
 * This type represents a transaction decoding for an ordinary function call to a known class;
 * not a constructor call, not a fallback call.
 */
export interface FunctionDecoding {
  /**
   * The kind of decoding; indicates that this is a FunctionDecoding.
   */
  kind: "function";
  /**
   * The class of contract that was called, as a Types.ContractType.
   */
  class: Types.ContractType;
  /**
   * The list of decoded arguments to the function.
   */
  arguments: AbiArgument[];
  /**
   * The ABI entry for the function that was called.  You can use this
   * to extract the name, for instance.
   */
  abi: Abi.FunctionAbiEntry;
  /**
   * The selector for the function that was called, as a hexadecimal string.
   */
  selector: string;
  /**
   * The decoding mode that was used; see the README for more on these.
   */
  decodingMode: DecodingMode;
}

/**
 * This type represents a transaction decoding for a constructor call.
 * It's even possible to decode a library constructor call with this.
 *
 * NOTE: In the future, this type will also contain information about
 * any linked libraries the contract being constructed uses.  However,
 * this is not implemented at present.
 */
export interface ConstructorDecoding {
  /**
   * The kind of decoding; indicates that this is a ConstructorDecoding.
   */
  kind: "constructor";
  /**
   * The class of contract being constructed, as a Types.ContractType.
   */
  class: Types.ContractType;
  /**
   * The list of decoded arguments to the constructor.  This will be empty for a
   * default constructor.
   */
  arguments: AbiArgument[];
  /**
   * The ABI entry for the constructor that was called.  Note that although
   * default constructors don't actually get an ABI entry, we still return an
   * ABI entry regardless in that case.
   */
  abi: Abi.ConstructorAbiEntry;
  /**
   * The bytecode of the constructor that was called.
   */
  bytecode: string;
  /**
   * The decoding mode that was used; see the README for more on these.
   */
  decodingMode: DecodingMode;
}

/**
 * This type represents a decoding for a call to a known class that does not appear
 * to be a function call, i.e., one that will result in the fallback function being invoked
 * if there is one.
 */
export interface MessageDecoding {
  /**
   * The kind of decoding; indicates that this is a MessageDecoding.
   */
  kind: "message";
  /**
   * The class of contract that was called, as a Types.ContractType.
   */
  class: Types.ContractType;
  /**
   * The ABI entry for the contract's fallback function; will be null if
   * there is none.
   */
  abi: Abi.FallbackAbiEntry | null; //null indicates no fallback ABI
  /**
   * The data that was sent to the contract.
   */
  data: string;
  /**
   * The decoding mode that was used; see the README for more on these.
   */
  decodingMode: DecodingMode;
}

/**
 * This type represents a function call to an unknown class, or a constructor
 * call constructing an unknown class.  In this case, it's simply not possible
 * to return much information.
 */
export interface UnknownDecoding {
  /**
   * The kind of decoding; indicates that this is an UnknownDecoding.
   */
  kind: "unknown";
  /**
   * The decoding mode that was used; see the README for more on these.
   */
  decodingMode: DecodingMode;
  /**
   * The data that was sent to the contract, or the bytecode of the constructor.
   */
  data: string;
}

/**
 * This type represents a decoding of a log as a non-anonymous event.
 */
export interface EventDecoding {
  /**
   * The kind of decoding; indicates that this is an EventDecoding.
   */
  kind: "event";
  /**
   * The class of the contract that (according to this decoding) emitted the event, as a Types.ContractType.
   * This may be a library!  When a library emits an event, the EVM records it as the calling contract
   * having emitted the event, but we decode it as if the library emitted the event, for clarity.
   * (The address of the contract the EVM thinks emitted the event can of course be found in the original log.)
   */
  class: Types.ContractType;
  /**
   * The list of decoded arguments to the event.
   */
  arguments: AbiArgument[];
  /**
   * The ABI entry for the event.  You can use this to extract the name, for
   * instance.
   */
  abi: Abi.EventAbiEntry; //should be non-anonymous
  /**
   * The selector for the event, as a hexadecimal string.
   */
  selector: string;
  /**
   * The decoding mode that was used; see the README for more on these.
   */
  decodingMode: DecodingMode;
}

/**
 * This type represents a decoding of a log as an anonymous event.
 */
export interface AnonymousDecoding {
  /**
   * The kind of decoding; indicates that this is an AnonymousDecoding.
   */
  kind: "anonymous";
  /**
   * The class of the contract that (according to this decoding) emitted the event, as a Types.ContractType.
   * This may be a library!  When a library emits an event, the EVM records it as the calling contract
   * having emitted the event, but we decode it as if the library emitted the event, for clarity.
   * (The address of the contract the EVM thinks emitted the event can of course be found in the original log.)
   */
  class: Types.ContractType;
  /**
   * The list of decoded arguments to the event.
   */
  arguments: AbiArgument[];
  /**
   * The ABI entry for the event.  You can use this to extract the name, for
   * instance.
   */
  abi: Abi.EventAbiEntry; //should be anonymous
  /**
   * The decoding mode that was used; see the README for more on these.
   */
  decodingMode: DecodingMode;
}

/**
 * This type represents a decoded argument passed to a transaction or event.
 */
export interface AbiArgument {
  /**
   * The name of the parameter.  Excluded if the parameter is nameless.
   */
  name?: string; //included if parameter is named
  /**
   * Whether this is an indexed paramter.  Only included for event parameters.
   */
  indexed?: boolean; //included for event parameters
  /**
   * The decoded value of the argument.  Note that this is a [[Format.Values.Result|Values.Result]], so it
   * may contain errors (although event decodings should typically not contain errors;
   * see the [[DecodedLog]] documentation for why).
   */
  value: Values.Result;
}

export type DecoderRequest = StorageRequest | CodeRequest;

export interface StorageRequest {
  type: "storage";
  slot: BN; //will add more fields as needed
}

export interface CodeRequest {
  type: "code";
  address: string;
}

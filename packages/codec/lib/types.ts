import BN from "bn.js";

import * as AbiData from "@truffle/codec/abi-data/types";
import * as Format from "@truffle/codec/format";

/**
 * A type representing a transaction (calldata) decoding.  As you can see, these come in five types,
 * each of which is documented separately.
 * @Category Output
 */
export type CalldataDecoding =
  | FunctionDecoding
  | ConstructorDecoding
  | MessageDecoding
  | UnknownCallDecoding
  | UnknownCreationDecoding;

/**
 * A type representing a log (event) decoding.  As you can see, these come in two types, each of which
 * is documented separately.
 * @Category Output
 */
export type LogDecoding = EventDecoding | AnonymousDecoding;

/**
 * A type representing a returndata (return value or revert message) decoding.
 * As you can see, these come in six types, each of which is documented
 * separately.
 * @Category Output
 */
export type ReturndataDecoding =
  | ReturnDecoding
  | BytecodeDecoding
  | UnknownBytecodeDecoding
  | SelfDestructDecoding
  | RevertMessageDecoding
  | EmptyFailureDecoding;

/**
 * This is a type for recording what decoding mode a given decoding was produced in.  There are two
 * decoding modes, full mode and ABI mode.  In ABI mode, decoding is done purely based on the ABI JSON.
 * Full mode, by contrast, additionally uses AST information to produce a more informative decoding.
 * For more on full mode and ABI mode, see the notes on [Decoding modes](../#decoding-modes).
 * @Category Output
 */
export type DecodingMode = "full" | "abi";

/**
 * This type represents a transaction decoding for an ordinary function call to a known class;
 * not a constructor call, not a fallback call.
 * @Category Output
 */
export interface FunctionDecoding {
  /**
   * The kind of decoding; indicates that this is a FunctionDecoding.
   */
  kind: "function";
  /**
   * The class of contract that was called, as a Format.Types.ContractType.
   */
  class: Format.Types.ContractType;
  /**
   * The list of decoded arguments to the function.
   */
  arguments: AbiArgument[];
  /**
   * The ABI entry for the function that was called.  You can use this
   * to extract the name, for instance.
   */
  abi: AbiData.FunctionAbiEntry;
  /**
   * The selector for the function that was called, as a hexadecimal string.
   */
  selector: string;
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
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
 *
 * @Category Output
 */
export interface ConstructorDecoding {
  /**
   * The kind of decoding; indicates that this is a ConstructorDecoding.
   */
  kind: "constructor";
  /**
   * The class of contract being constructed, as a Format.Types.ContractType.
   */
  class: Format.Types.ContractType;
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
  abi: AbiData.ConstructorAbiEntry;
  /**
   * The bytecode of the constructor that was called.
   */
  bytecode: string;
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
}

/**
 * This type represents a decoding for a call to a known class that does not appear
 * to be a function call, i.e., one that will result in the fallback function being invoked
 * if there is one.
 *
 * @Category Output
 */
export interface MessageDecoding {
  /**
   * The kind of decoding; indicates that this is a MessageDecoding.
   */
  kind: "message";
  /**
   * The class of contract that was called, as a Format.Types.ContractType.
   */
  class: Format.Types.ContractType;
  /**
   * The ABI entry for the contract's fallback or receive function that would
   * handle this message; will be null if there is none.
   */
  abi: AbiData.FallbackAbiEntry | AbiData.ReceiveAbiEntry | null;
  /**
   * The data that was sent to the contract.
   */
  data: string;
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
}

/**
 * This type represents a function call to an unknown class.  In this case,
 * it's simply not possible to return much information.
 *
 * @Category Output
 */
export interface UnknownCallDecoding {
  /**
   * The kind of decoding; indicates that this is an UnknownDecoding.
   */
  kind: "unknown";
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
  /**
   * The data that was sent to the contract.
   */
  data: string;
}

/**
 * This type represents a contract creation for an unknown class. In this case,
 * it's simply not possible to return much information.
 *
 * @Category Output
 */
export interface UnknownCreationDecoding {
  /**
   * The kind of decoding; indicates that this is an UnknownCreationDecoding.
   */
  kind: "create";
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
  /**
   * The bytecode of the contract creation.
   */
  bytecode: string;
}

/**
 * This type represents a decoding of a log as a non-anonymous event.
 *
 * @Category Output
 */
export interface EventDecoding {
  /**
   * The kind of decoding; indicates that this is an EventDecoding.
   */
  kind: "event";
  /**
   * The class of the contract that (according to this decoding) emitted the event, as a Format.Types.ContractType.
   * This may be a library!  When a library emits an event, the EVM records it as the calling contract
   * having emitted the event, but we decode it as if the library emitted the event, for clarity.
   * (The address of the contract the EVM thinks emitted the event can of course be found in the original log.)
   */
  class: Format.Types.ContractType;
  /**
   * The class of the contract that (according to this decoding) defined the event, as a Format.Types.ContractType.
   * May be omitted if we can't determine it, as may occur in ABI mode.
   */
  definedIn?: Format.Types.ContractType;
  /**
   * The list of decoded arguments to the event.
   */
  arguments: AbiArgument[];
  /**
   * The ABI entry for the event.  You can use this to extract the name, for
   * instance.
   */
  abi: AbiData.EventAbiEntry; //should be non-anonymous
  /**
   * The selector for the event, as a hexadecimal string.
   */
  selector: string;
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
}

/**
 * This type represents a decoding of a log as an anonymous event.
 *
 * @Category Output
 */
export interface AnonymousDecoding {
  /**
   * The kind of decoding; indicates that this is an AnonymousDecoding.
   */
  kind: "anonymous";
  /**
   * The class of the contract that (according to this decoding) emitted the event, as a Format.Types.ContractType.
   * This may be a library!  When a library emits an event, the EVM records it as the calling contract
   * having emitted the event, but we decode it as if the library emitted the event, for clarity.
   * (The address of the contract the EVM thinks emitted the event can of course be found in the original log.)
   */
  class: Format.Types.ContractType;
  /**
   * The class of the contract that (according to this decoding) defined the event, as a Format.Types.ContractType.
   * May be omitted if we can't determine it, as may occur in ABI mode.
   */
  definedIn?: Format.Types.ContractType;
  /**
   * The list of decoded arguments to the event.
   */
  arguments: AbiArgument[];
  /**
   * The ABI entry for the event.  You can use this to extract the name, for
   * instance.
   */
  abi: AbiData.EventAbiEntry; //should be anonymous
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
}

/**
 * This type represents a decoding of the return data as a collection of
 * return values from a successful call.
 * @Category Output
 */
export interface ReturnDecoding {
  /**
   * The kind of decoding; indicates that this is a ReturnDecoding.
   */
  kind: "return";
  /**
   * Indicates that this kind of decoding indicates a successful return.
   */
  status: true;
  /**
   * The list of decoded return values from the function.
   */
  arguments: AbiArgument[];
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
}

/**
 * This type represents a decoding of unexpectedly empty return data from a
 * successful call, indicating that the contract self-destructed.
 * @Category Output
 */
export interface SelfDestructDecoding {
  /**
   * The kind of decoding; indicates that this is an SelfDestructDecoding.
   */
  kind: "selfdestruct";
  /**
   * Indicates that this kind of decoding indicates a successful return.
   */
  status: true;
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
}

/**
 * This type represents a decoding of empty return data from an unsuccessful
 * call, a reversion with no message.
 * @Category Output
 */
export interface EmptyFailureDecoding {
  /**
   * The kind of decoding; indicates that this is an EmptyFailureDecoding.
   */
  kind: "failure";
  /**
   * Indicates that this kind of decoding indicates an unsuccessful return.
   */
  status: false;
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
}

/**
 * This type represents a decoding of the return data as a revert message.
 * For forward-compatibility, we do not assume that the revert message is
 * a string.
 * @Category Output
 */
export interface RevertMessageDecoding {
  /**
   * The kind of decoding; indicates that this is a RevertMessageDecoding.
   */
  kind: "revert";
  /**
   * Indicates that this kind of decoding indicates an unsuccessful return.
   */
  status: false;
  /**
   * The list of decoded arguments passed to revert(); currently, this will
   * always contain just a single string.
   */
  arguments: AbiArgument[];
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
}

/**
 * This type represents a decoding of the return data as bytecode for a known
 * class returned from a constructor.
 *
 * NOTE: In the future, this type will also contain information about
 * any linked libraries the contract being constructed uses.  However,
 * this is not implemented at present.
 *
 * @Category Output
 */
export interface BytecodeDecoding {
  /**
   * The kind of decoding; indicates that this is a BytecodeDecoding.
   */
  kind: "bytecode";
  /**
   * Indicates that this kind of decoding indicates a successful return.
   */
  status: true;
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
  /**
   * The class of contract being constructed, as a Format.Types.ContractType.
   */
  class: Format.Types.ContractType;
  /**
   * The bytecode of the contract that was created.
   */
  bytecode: string;
  /**
   * If the contract created was a library, and was compiled with Solidity
   * 0.4.20 or later, this field will be included, which gives the address of
   * the created contract (checksummed).  This field will not be included
   * otherwise!
   */
  address?: string;
}

/**
 * This type represents a decoding of the return data as bytecode for an
 * unknown class returned from a constructor.
 *
 * NOTE: In the future, this type will also contain information about
 * any linked libraries the contract being constructed uses.  However,
 * this is not implemented at present.
 *
 * @Category Output
 */
export interface UnknownBytecodeDecoding {
  /**
   * The kind of decoding; indicates that this is an UnknownBytecodeDecoding.
   */
  kind: "unknownbytecode";
  /**
   * Indicates that this kind of decoding indicates a successful return.
   */
  status: true;
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
  /**
   * The bytecode of the contract that was created.
   */
  bytecode: string;
}

/**
 * This type represents a decoded argument passed to a transaction or event,
 * or returned from a call.
 *
 * @Category Output
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
   * The decoded value of the argument.  Note that this is a [[Format.Values.Result|Format.Values.Result]], so it
   * may contain errors (although event decodings should typically not contain errors;
   * see the [[DecodedLog]] documentation for why).
   */
  value: Format.Values.Result;
}

/**
 * @Category Requests
 */
export type DecoderRequest = StorageRequest | CodeRequest;

/**
 * A request for storage
 *
 * @Category Requests
 */
export interface StorageRequest {
  type: "storage";
  slot: BN; //will add more fields as needed
}

/**
 * A request for code
 *
 * @Category Requests
 */
export interface CodeRequest {
  type: "code";
  address: string;
}

export type PaddingMode = "default" | "permissive" | "zero" | "right";
//default: check padding; the type of padding is determined by the type
//permissive: like default, but turns off the check on certain types
//zero: forces zero-padding even on signed types
//right: forces right-padding on all types

export type PaddingType = "left" | "right" | "signed";

export interface DecoderOptions {
  paddingMode?: PaddingMode;
  strictAbiMode?: boolean; //throw errors instead of returning; check array & string lengths (crudely)
  allowRetry?: boolean; //turns on error-throwing for retry-allowed errors only
  abiPointerBase?: number; //what relative pointers should be considered relative to
  memoryVisited?: number[]; //for circularity detection
}

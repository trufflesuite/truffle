import type BN from "bn.js";
import type Big from "big.js";

import type * as Abi from "@truffle/abi-utils";
import type * as Types from "@truffle/codec/format/types";
import type * as Values from "@truffle/codec/format/values";
import type { PaddingMode } from "@truffle/codec/common";

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
  | RawReturnDecoding
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
 * Used for representing decoded state variables.
 * @category Output
 */
export interface StateVariable {
  /**
   * The name of the variable.  Note that due to inheritance, this may not be unique
   * among the contract's state variables.
   */
  name: string;
  /**
   * The class of the contract that defined the variable, as a Format.Types.ContractType.
   * Note that this class may differ from that of the contract being decoded, due
   * to inheritance.
   */
  class: Types.ContractType;
  /**
   * The decoded value of the variable.  Note this is a Format.Values.Result, so it may be an error.
   */
  value: Values.Result;
}

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
  class: Types.ContractType;
  /**
   * The list of decoded arguments to the function.
   */
  arguments: AbiArgument[];
  /**
   * The ABI entry for the function that was called.  You can use this
   * to extract the name, for instance.
   */
  abi: Abi.FunctionEntry;
  /**
   * The selector for the function that was called, as a hexadecimal string.
   */
  selector: string;
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   */
  interpretations: {
    /**
     * If this interpretation is present, indicates that the transaction can be
     * understood as a multicall (v1).  The field contains decodings for the
     * individual calls that the multicall can be broken into.  Note that in
     * case of an error, individual decodings will be returned as null, so be
     * sure to check for this.
     */
    multicall?: (CalldataDecoding | null)[];
    /**
     * If this interpretation is present, indicates that the transaction can be
     * understood as an `aggregate` (from multicallv2).  This also includes
     * `blockAndAggregate`, as well as `aggregate3` (from multicallv3), and
     * `aggregate3Value`.  See [[CallInterpretationInfo]] for more information.
     */
    aggregate?: CallInterpretationInfo[];
    /**
     * Similar to the `aggregate` interpretation, but for `tryAggregate`.  Also
     * includes `tryBlockAndAggregate`.
     */
    tryAggregate?: TryAggregateInfo;
    /**
     * Similar to `multicall`, but for Uniswap's deadlined multicall.
     */
    deadlinedMulticall?: DeadlinedMulticallInfo;
    /**
     * Similar to `multicall`, but for Uniswap's multicall with previous block hash.
     */
    specifiedBlockhashMulticall?: BlockhashedMulticallInfo;
  };
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
  abi: Abi.ConstructorEntry;
  /**
   * The bytecode of the constructor that was called.
   */
  bytecode: string;
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   * (Currently there are none for this type.)
   */
  interpretations: {};
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
  class: Types.ContractType;
  /**
   * The ABI entry for the contract's fallback or receive function that would
   * handle this message; will be null if there is none.
   */
  abi: Abi.FallbackEntry | Abi.ReceiveEntry | null;
  /**
   * The data that was sent to the contract.
   */
  data: string;
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   */
  interpretations: {
    /**
     * If we can't recognize the function, we attempt to see if we can decode based on the
     * function selector alone using https://www.4byte.directory/ to determine possible
     * signatures.  Note these decodings will necessarily be made in ABI mode, and will
     * even be lacking names of struct members.
     *
     * This interpretation will only be present if the array is nonempty.
     */
    selectorBasedDecodings?: FunctionDecoding[];
  };
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
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   */
  interpretations: {
    /**
     * If we can't recognize the function, we attempt to see if we can decode based on the
     * function selector alone using https://www.4byte.directory/ to determine possible
     * signatures.  Note these decodings will necessarily be made in ABI mode, and will
     * even be lacking names of struct members.
     *
     * This interpretation will only be present if the array is nonempty.
     */
    selectorBasedDecodings?: FunctionDecoding[];
  };
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
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   * (Currently there are none for this type.)
   */
  interpretations: {};
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
  class: Types.ContractType;
  /**
   * The class of the contract that (according to this decoding) defined the event, as a Format.Types.ContractType.
   * May be omitted if we can't determine it, as may occur in ABI mode.  If null, this means that it's a file-level
   * event (which as of right now is just future-proofing).
   */
  definedIn?: Types.ContractType | null;
  /**
   * The list of decoded arguments to the event.
   */
  arguments: AbiArgument[];
  /**
   * The ABI entry for the event.  You can use this to extract the name, for
   * instance.
   */
  abi: Abi.EventEntry; //should be non-anonymous
  /**
   * The selector for the event, as a hexadecimal string.
   */
  selector: string;
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   * (Currently there are none for this type.)
   */
  interpretations: {};
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
  class: Types.ContractType;
  /**
   * The class of the contract that (according to this decoding) defined the event, as a Format.Types.ContractType.
   * May be omitted if we can't determine it, as may occur in ABI mode.
   */
  definedIn?: Types.ContractType;
  /**
   * The list of decoded arguments to the event.
   */
  arguments: AbiArgument[];
  /**
   * The ABI entry for the event.  You can use this to extract the name, for
   * instance.
   */
  abi: Abi.EventEntry; //should be anonymous
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   * (Currently there are none for this type.)
   */
  interpretations: {};
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
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   * (Currently there are none for this type.)
   */
  interpretations: {};
}

/**
 * This type represents a decoding of the return data as a raw bytestring
 * (as might be returned from a fallback function).
 * @Category Output
 */
export interface RawReturnDecoding {
  /**
   * The kind of decoding; indicates that this is a RawReturnDecoding.
   */
  kind: "returnmessage";
  /**
   * Indicates that this kind of decoding indicates a successful return.
   */
  status: true;
  /**
   * The returned bytestring, as a hex string.
   */
  data: string;
  /**
   * The decoding mode that was used; [see the README](../#decoding-modes) for
   * more on these.
   */
  decodingMode: DecodingMode;
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   * (Currently there are none for this type.)
   */
  interpretations: {};
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
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   * (Currently there are none for this type.)
   */
  interpretations: {};
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
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   * (Currently there are none for this type.)
   */
  interpretations: {};
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
   * The ABI entry for the error that was thrown.  You can use this
   * to extract the name, for instance.  This may be spoofed for built-in
   * types of errors.
   */
  abi: Abi.ErrorEntry;
  /**
   * The class of the contract that (according to this decoding) defined the
   * error type, as a Format.Types.ContractType.  This will be `null` if the
   * error was defined outside of the contract or it's one of the builtin
   * `Error(string)` or `Panic(uint)` types.
   * May be omitted if we can't determine it, as may occur in ABI mode.
   */
  definedIn?: Types.ContractType | null;
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
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   * (Currently there are none for this type.)
   */
  interpretations: {};
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
  class: Types.ContractType;
  /**
   * Decodings for any immutable state variables the created contract contains.
   * Omitted in ABI mode.
   */
  immutables?: StateVariable[];
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
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   * (Currently there are none for this type.)
   */
  interpretations: {};
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
  /**
   * Further information about how the decoding may be interpreted.  Note that interpretations
   * may be added by things that use @truffle/codec, such as @truffle/decoder, rather than by
   * @truffle/codec itself.  See individual interpretations for details.
   * (Currently there are none for this type.)
   */
  interpretations: {};
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
  value: Values.Result;
}

/**
 * @Category Requests
 */
export type DecoderRequest =
  | StorageRequest
  | CodeRequest
  | EnsPrimaryNameRequest;

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

/**
 * A request for a (primary) ENS name
 *
 * @Category Requests
 */
export interface EnsPrimaryNameRequest {
  type: "ens-primary-name";
  address: string;
}

export interface DecoderOptions {
  paddingMode?: PaddingMode;
  strictAbiMode?: boolean; //throw errors instead of returning; check array & string lengths (crudely)
  allowRetry?: boolean; //turns on error-throwing for retry-allowed errors only
  abiPointerBase?: number; //what relative pointers should be considered relative to
  memoryVisited?: number[]; //for circularity detection
  lengthOverride?: BN; //if present, causes the ABI decoder to use this length instead of reading it from the data
}

/**
 * Used to indicate whether "extra" event decodings -- event decodings from
 * non-library contracts other than the one that appears to have emitted
 * the event -- should be returned.
 *
 * * `"off"`: Exclude extra decodings (the default).
 * * `"on"`: Include extra decodings.
 * * `"necessary"`: Include extra decodings only if there are no others.
 *
 * Extra decodings will always be returned after other decodings.
 *
 * @Category Inputs
 */
export type ExtrasAllowed = "off" | "on" | "necessary";

/**
 * The type of the options parameter to [[decodeEvent]].  This type will be expanded in the future
 * as more filtering options are added.
 *
 * @Category Inputs
 */
export interface LogOptions {
  /**
   * If passed, restricts to events with the given name.
   */
  name?: string;
  /**
   * Used to indicate whether "extra" event decodings -- event decodings from
   * non-library contracts other than the one that appears to have emitted
   * the event -- should be returned.  Defaults to `"off"`.
   */
  extras?: ExtrasAllowed;
  /**
   * If passed, restricts to events with the given ID.  This is meant for
   * internal use by Truffle Debugger; you probably don't want to bother
   * with this option.
   */
  id?: string;
  /**
   * Allows decodings that don't pass the re-encoding test.  Don't turn
   * this on unless you know what you're doing!
   */
  disableChecks?: boolean;
}

/**
 * An encoder request; can come in one of three types.  It can be either a
 * request to understand a numeric input (integer or decimal), or a request to
 * resolve a contract name.  The "kind" field distinguishes.
 *
 * @Category Requests
 */
export type WrapRequest =
  | IntegerWrapRequest
  | DecimalWrapRequest
  | AddressWrapRequest;

/**
 * A request to understand an integer value.
 *
 * @Category Requests
 */
export interface IntegerWrapRequest {
  /**
   * Indicates that this is a IntegerWrapRequest.
   */
  kind: "integer";
  /**
   * The input whose numeric value needs to be extracted.
   */
  input: unknown;
}

/**
 * A request to understand an decimal value.
 *
 * @Category Requests
 */
export interface DecimalWrapRequest {
  /**
   * Indicates that this is a DecimalWrapRequest.
   */
  kind: "decimal";
  /**
   * The input whose numeric value needs to be extracted.
   */
  input: unknown;
}

/**
 * A request to resolve a contract name to an address.
 *
 * @Category Requests
 */
export interface AddressWrapRequest {
  /**
   * Indicates that this is an AddressWrapRequest.
   */
  kind: "address";
  /**
   * The name that needs to be resolved to an address.
   */
  name: string;
}

/**
 * An encoder response; contains either a numeric value (as a BigInt or Big)
 * or an address.
 *
 * @Category Requests
 */
export type WrapResponse =
  | IntegerWrapResponse
  | DecimalWrapResponse
  | AddressWrapResponse;

/**
 * A response with an integral numeric value, as BigInt.
 *
 * @Category Requests
 */
export interface IntegerWrapResponse {
  /**
   * Indicates that this is a IntegerWrapResponse.
   */
  kind: "integer";
  /**
   * The numeric value that was extracted, as a BigInt, or null, to indicate
   * that either the number format wasn't recognized or wasn't an integer.
   */
  value: bigint | null;
  /**
   * If present, the reason the number wasn't recognized as an integer.
   */
  reason?: string;
  /**
   * If present, indicates that the input was recognized but not as an integer.
   */
  partiallyRecognized?: true;
}

/**
 * A response with an decimal numeric value, as Big.
 *
 * @Category Requests
 */
export interface DecimalWrapResponse {
  /**
   * Indicates that this is a DecimalWrapResponse.
   */
  kind: "decimal";
  /**
   * The numeric value that was extracted, as a Big, or null, to indicate
   * that the number format wasn't recognized.
   */
  value: Big | null;
  /**
   * If present, the reason the number wasn't recognized as a decimal.
   */
  reason?: string;
  /**
   * If present, indicates that the input was recognized but not as a decimal.
   */
  partiallyRecognized?: true;
}

/**
 * A response with an address for a contract name (or unusual address form).
 *
 * @Category Requests
 */
export interface AddressWrapResponse {
  /**
   * Indicates that this is an AddressWrapResponse.
   */
  kind: "address";
  /**
   * The address for the contract name, or null, to indicate that no such
   * contract was found.
   */
  address: string | null;
  /**
   * If present, the reason the address wasn't found.
   */
  reason?: string;
  /**
   * If present, indicates that the input was recognized but not as a valid address.
   */
  partiallyRecognized?: true;
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

/**
 * @hidden
 */
export type RegularizedBlockSpecifier = number | "pending";

/**
 * Used by some multicall-like interpretations.
 * @category Output
 */
export interface CallInterpretationInfo {
  /**
   * The address the call was sent to; may be null in case of
   * an error.
   */
  address: string | null;
  /**
   * The decoding of the call; may be null in case of error.
   */
  decoding: CalldataDecoding | null;
  /**
   * Whether failure was allowed; may be null in case of error.
   */
  allowFailure: boolean | null;
  /**
   * The value sent with the call, in Wei.  May be null in case of error.
   */
  value: BN | null;
}

/**
 * Used by the `tryAggregate` interpretation.
 * @category Output
 */
export interface TryAggregateInfo {
  /**
   * Whether success was required.
   */
  requireSuccess: boolean;
  /**
   * The decodings of the individual calls.
   */
  calls: CallInterpretationInfo[];
}

/**
 * Used by the `deadlinedMulticall` interpretation.
 * @category Output
 */
export interface DeadlinedMulticallInfo {
  /**
   * The deadline.
   */
  deadline: BN;
  /**
   * The decodings of the individual calls; these may each be null in
   * case of an error.
   */
  calls: (CalldataDecoding | null)[];
}

/**
 * Used by the `specifiedBlockhashMulticall` interpretation.
 * @category Output
 */
export interface BlockhashedMulticallInfo {
  /**
   * The specified parent blockhash.
   */
  specifiedBlockhash: string;
  /**
   * The decodings of the individual calls; these may each be null in
   * case of an error.
   */
  calls: (CalldataDecoding | null)[];
}

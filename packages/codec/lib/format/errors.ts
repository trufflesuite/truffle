/**
 * Contains the types for error and `ErrorResult` objects.
 * @category Main Format
 *
 * @packageDocumentation
 */
import debugModule from "debug";
const debug = debugModule("codec:format:errors");

//error counterpart to values.ts

//Note: Many of the errors defined here deliberately *don't* extend Error.
//This is because they're not for throwing.  If you want to throw one,
//wrap it in a DecodingError.

import type BN from "bn.js";
import type * as Types from "./types";
import type * as Ast from "@truffle/codec/ast/types";
import type * as Storage from "@truffle/codec/storage/types";
import type { PaddingType } from "@truffle/codec/common";

/*
 * SECTION 1: Generic types for values in general (including errors).
 */

/**
 * A result which is an error rather than a value
 *
 * @Category General categories
 */
export type ErrorResult =
  | ElementaryErrorResult
  | ArrayErrorResult
  | MappingErrorResult
  | StructErrorResult
  | MagicErrorResult
  | TypeErrorResult
  | TupleErrorResult
  | FunctionExternalErrorResult
  | FunctionInternalErrorResult
  | OptionsErrorResult;

/**
 * An error result for an ABI type
 *
 * @Category General categories
 */
export type AbiErrorResult =
  | UintErrorResult
  | IntErrorResult
  | BoolErrorResult
  | BytesErrorResult
  | AddressErrorResult
  | FixedErrorResult
  | UfixedErrorResult
  | StringErrorResult
  | ArrayErrorResult
  | FunctionExternalErrorResult
  | TupleErrorResult;

/**
 * One of the underlying errors contained in an [[ErrorResult]]
 *
 * @Category General categories
 */
export type DecoderError =
  | GenericError
  | UintError
  | IntError
  | BoolError
  | BytesStaticError
  | BytesDynamicError
  | AddressError
  | StringError
  | FixedError
  | UfixedError
  | ArrayError
  | MappingError
  | StructError
  | MagicError
  | TypeErrorUnion
  | TupleError
  | EnumError
  | UserDefinedValueTypeError
  | ContractError
  | FunctionExternalError
  | FunctionInternalError
  | InternalUseError;

/*
 * SECTION 2: Built-in elementary types
 */

/**
 * An error result for an elementary value
 *
 * @Category Elementary types
 */
export type ElementaryErrorResult =
  | UintErrorResult
  | IntErrorResult
  | BoolErrorResult
  | BytesErrorResult
  | AddressErrorResult
  | StringErrorResult
  | FixedErrorResult
  | UfixedErrorResult
  | EnumErrorResult
  | UserDefinedValueTypeErrorResult
  | ContractErrorResult;

/**
 * An error result for a built-in value type
 *
 * @Category Elementary types
 */
export type BuiltInValueErrorResult =
  | UintErrorResult
  | IntErrorResult
  | BoolErrorResult
  | BytesStaticErrorResult
  | AddressErrorResult
  | FixedErrorResult
  | UfixedErrorResult;

/**
 * An error result for a bytestring
 *
 * @Category Elementary types
 */
export type BytesErrorResult = BytesStaticErrorResult | BytesDynamicErrorResult;

/**
 * An error result for an unsigned integer
 *
 * @Category Elementary types
 */
export interface UintErrorResult {
  type: Types.UintType;
  kind: "error";
  error: GenericError | UintError;
}

/**
 * A uint-specific error
 *
 * @Category Elementary types
 */
export type UintError = UintPaddingError;

/**
 * A padding error for an unsigned integer (note padding is not always checked)
 *
 * @Category Elementary types
 */
export interface UintPaddingError {
  /**
   * hex string
   */
  raw: string;
  kind: "UintPaddingError";
  paddingType: PaddingType;
}

/**
 * An error result for a signed integer
 *
 * @Category Elementary types
 */
export interface IntErrorResult {
  type: Types.IntType;
  kind: "error";
  error: GenericError | IntError;
}

/**
 * An int-specific error
 *
 * @Category Elementary types
 */
export type IntError = IntPaddingError;

/**
 * A padding error for a signed integer (note padding is not always checked)
 *
 * @Category Elementary types
 */
export interface IntPaddingError {
  /**
   * hex string
   */
  raw: string;
  kind: "IntPaddingError";
  paddingType: PaddingType;
}

/**
 * An error result for a boolean
 *
 * @Category Elementary types
 */
export interface BoolErrorResult {
  type: Types.BoolType;
  kind: "error";
  error: GenericError | BoolError;
}

/**
 * A bool-specific error
 *
 * @Category Elementary types
 */
export type BoolError = BoolOutOfRangeError | BoolPaddingError;

/**
 * The bool is neither 0 nor 1
 *
 * @Category Elementary types
 */
export interface BoolOutOfRangeError {
  rawAsBN: BN;
  kind: "BoolOutOfRangeError";
}

/**
 * A padding error for a boolean
 *
 * @Category Elementary types
 */
export interface BoolPaddingError {
  /**
   * hex string
   */
  raw: string;
  kind: "BoolPaddingError";
  paddingType: PaddingType;
}

/**
 * An error result for a static-length bytestring
 *
 * @Category Elementary types
 */
export interface BytesStaticErrorResult {
  type: Types.BytesTypeStatic;
  kind: "error";
  error: GenericError | BytesStaticError;
}

/**
 * A static-bytestring-specific error
 *
 * @Category Elementary types
 */
export type BytesStaticError = BytesPaddingError;

/**
 * A padding error for a static-length bytestring (note padding is not always checked)
 *
 * @Category Elementary types
 */
export interface BytesPaddingError {
  /**
   * hex string
   */
  raw: string;
  kind: "BytesPaddingError";
  paddingType: PaddingType;
}

/**
 * An error result for a dynamic-length bytestring
 *
 * @Category Elementary types
 */
export interface BytesDynamicErrorResult {
  type: Types.BytesTypeDynamic;
  kind: "error";
  error: GenericError | BytesDynamicError;
}

/**
 * A dynamic-bytestring-specific error
 *
 * @Category Elementary types
 */
export type BytesDynamicError = DynamicDataImplementationError;

/**
 * An error result for an address
 *
 * @Category Elementary types
 */
export interface AddressErrorResult {
  type: Types.AddressType;
  kind: "error";
  error: GenericError | AddressError;
}

/**
 * A address-specific error
 *
 * @Category Elementary types
 */
export type AddressError = AddressPaddingError;

/**
 * A padding error for an address (note padding is not always checked)
 *
 * @Category Elementary types
 */
export interface AddressPaddingError {
  /**
   * hex string; no checksum
   */
  raw: string;
  kind: "AddressPaddingError";
  paddingType: PaddingType;
}

/**
 * An error result for a string
 *
 * @Category Elementary types
 */
export interface StringErrorResult {
  type: Types.StringType;
  kind: "error";
  error: GenericError | StringError;
}

/**
 * A string-specific error
 *
 * @Category Elementary types
 */
export type StringError = DynamicDataImplementationError;

/**
 * An error result for a signed fixed-point number
 *
 * @Category Elementary types
 */
export interface FixedErrorResult {
  type: Types.FixedType;
  kind: "error";
  error: GenericError | FixedError;
}
/**
 * An error result for an unsigned fixed-point number
 *
 * @Category Elementary types
 */
export interface UfixedErrorResult {
  type: Types.UfixedType;
  kind: "error";
  error: GenericError | UfixedError;
}

/**
 * A fixed-specific error
 *
 * @Category Elementary types
 */
export type FixedError = FixedPaddingError;

/**
 * A padding error for a signed fixed-point number (note padding is not always checked)
 *
 * @Category Elementary types
 */
export interface FixedPaddingError {
  /**
   * hex string
   */
  raw: string;
  kind: "FixedPaddingError";
  paddingType: PaddingType;
}

/**
 * A ufixed-specific error
 *
 * @Category Elementary types
 */
export type UfixedError = UfixedPaddingError;

/**
 * A padding error for an unsigned fixed-point number (note padding is not always checked)
 *
 * @Category Elementary types
 */
export interface UfixedPaddingError {
  /**
   * hex string
   */
  raw: string;
  kind: "UfixedPaddingError";
  paddingType: PaddingType;
}

/*
 * SECTION 3: User-defined elementary types
 */

/**
 * An error result for an enum
 *
 * @Category User-defined elementary types
 */
export interface EnumErrorResult {
  type: Types.EnumType;
  kind: "error";
  error: GenericError | EnumError;
}

/**
 * An enum-specific error
 *
 * @Category User-defined elementary types
 */
export type EnumError =
  | EnumOutOfRangeError
  | EnumPaddingError
  | EnumNotFoundDecodingError;

/**
 * The enum is out of range
 *
 * @Category User-defined elementary types
 */
export interface EnumOutOfRangeError {
  kind: "EnumOutOfRangeError";
  type: Types.EnumType;
  rawAsBN: BN;
}

/**
 * A padding error for an enum
 *
 * @Category Elementary types
 */
export interface EnumPaddingError {
  /**
   * hex string
   */
  raw: string;
  type: Types.EnumType;
  kind: "EnumPaddingError";
  paddingType: PaddingType;
}

/**
 * The enum type definition could not be located
 *
 * @Category User-defined elementary types
 */
export interface EnumNotFoundDecodingError {
  kind: "EnumNotFoundDecodingError";
  type: Types.EnumType;
  rawAsBN: BN;
}

/**
 * An error result for a user-defined value type
 *
 * @Category User-defined elementary types
 */
export interface UserDefinedValueTypeErrorResult {
  type: Types.UserDefinedValueTypeType;
  kind: "error";
  error: GenericError | UserDefinedValueTypeError;
}

/**
 * A UDVT-specific error
 *
 * @Category User-defined elementary types
 */
export type UserDefinedValueTypeError = WrappedError;

/**
 * An error result representing something going wrong decoding
 * the underlying type when decoding a UDVT
 *
 * @Category User-defined elementary types
 */
export interface WrappedError {
  kind: "WrappedError";
  error: BuiltInValueErrorResult;
}

/**
 * An error result for a contract
 *
 * @Category User-defined elementary types
 */
export interface ContractErrorResult {
  type: Types.ContractType;
  kind: "error";
  error: GenericError | ContractError;
}

/**
 * A contract-specific error
 *
 * @Category User-defined elementary types
 */
export type ContractError = ContractPaddingError;

/**
 * A padding error for contract (note padding is not always checked)
 *
 * @Category User-defined elementary types
 */
export interface ContractPaddingError {
  /**
   * hex string
   */
  raw: string;
  kind: "ContractPaddingError";
  paddingType: PaddingType;
}

/*
 * SECTION 4: Container types (including magic)
 */

/**
 * An error result for an array
 *
 * @Category Container types
 */
export interface ArrayErrorResult {
  type: Types.ArrayType;
  kind: "error";
  error: GenericError | ArrayError;
}

/**
 * An arrray-specific error
 *
 * @Category Container types
 */
export type ArrayError = DynamicDataImplementationError;

/**
 * An error result for a mapping
 *
 * @Category Container types
 */
export interface MappingErrorResult {
  type: Types.MappingType;
  kind: "error";
  error: GenericError | MappingError;
}

/**
 * A mapping-specific error (there are none)
 *
 * @Category Container types
 */
export type MappingError = never;

/**
 * An error result for a struct
 *
 * @Category Container types
 */
export interface StructErrorResult {
  type: Types.StructType;
  kind: "error";
  error: GenericError | StructError;
}

/**
 * A struct-specific error
 *
 * @Category Container types
 */
export type StructError = DynamicDataImplementationError;

/**
 * An error result for a tuple
 *
 * @Category Container types
 */
export interface TupleErrorResult {
  type: Types.TupleType;
  kind: "error";
  error: GenericError | TupleError;
}

/**
 * A tuple-specific error
 *
 * @Category Container types
 */
export type TupleError = DynamicDataImplementationError;

/**
 * An error result for a magic variable
 *
 * @Category Special container types (debugger-only)
 */
export interface MagicErrorResult {
  type: Types.MagicType;
  kind: "error";
  error: GenericError | MagicError;
}

/**
 * A magic-specific error (there are none)
 *
 * @Category Special container types (debugger-only)
 */
export type MagicError = never;

/**
 * An error result for a type
 *
 * @Category Special container types (debugger-only)
 */
export interface TypeErrorResult {
  type: Types.TypeType;
  kind: "error";
  error: GenericError | TypeErrorUnion;
}

/**
 * An error specific to type values (there are none);
 * this isn't called TypeError because that's not legal
 *
 * @Category Special container types (debugger-only)
 */
export type TypeErrorUnion = never;

/*
 * SECTION 5: External functions
 */

/**
 * An error result for an external function
 *
 * @Category Function types
 */
export interface FunctionExternalErrorResult {
  type: Types.FunctionExternalType;
  kind: "error";
  error: GenericError | FunctionExternalError;
}

/**
 * An external-function specific error
 *
 * @Category Function types
 */
export type FunctionExternalError =
  | FunctionExternalNonStackPaddingError
  | FunctionExternalStackPaddingError;

/**
 * This error kind represents a padding error for an external function pointer located anywhere other than the stack.
 *
 * @Category Function types
 */
export interface FunctionExternalNonStackPaddingError {
  /**
   * hex string
   */
  raw: string;
  kind: "FunctionExternalNonStackPaddingError";
  paddingType: PaddingType;
}

/**
 * This error kind represents a padding error for external function pointer located on the stack.
 *
 * @Category Function types
 */
export interface FunctionExternalStackPaddingError {
  /**
   * hex string (no checksum; also a full word long)
   */
  rawAddress: string;
  /**
   * hex string (but a full word long)
   */
  rawSelector: string;
  kind: "FunctionExternalStackPaddingError";
}

/*
 * SECTION 6: Internal functions
 */

/**
 * An error result for an internal function
 *
 * @Category Function types
 */
export interface FunctionInternalErrorResult {
  type: Types.FunctionInternalType;
  kind: "error";
  error: GenericError | FunctionInternalError;
}

/**
 * An internal-function specific error
 *
 * @Category Function types
 */
export type FunctionInternalError =
  | FunctionInternalPaddingError
  | NoSuchInternalFunctionError
  | DeployedFunctionInConstructorError
  | MalformedInternalFunctionError;

/**
 * A padding error for an internal function
 *
 * @Category Function types
 */
export interface FunctionInternalPaddingError {
  /**
   * hex string
   */
  raw: string;
  kind: "FunctionInternalPaddingError";
  paddingType: PaddingType;
}

/**
 * Indicates that the function pointer being decoded
 * fails to point to a valid function, and also is not one of the
 * default values
 *
 * @Category Function types
 */
export interface NoSuchInternalFunctionError {
  kind: "NoSuchInternalFunctionError";
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

/**
 * Indicates that this is a deployed-style pointer,
 * despite the fact that you're in a constructor
 *
 * @Category Function types
 */
export interface DeployedFunctionInConstructorError {
  kind: "DeployedFunctionInConstructorError";
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

/**
 * Used when the deployed PC is zero but the constructor PC
 * is nonzero
 *
 * @Category Function types
 */
export interface MalformedInternalFunctionError {
  kind: "MalformedInternalFunctionError";
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

/*
 * SECTION 7: Options
 */

/**
 * An options error.  This should never happen,
 * as options are never decoded, but it's included for
 * completeness.
 */
export interface OptionsErrorResult {
  type: Types.OptionsType;
  kind: "error";
  error: GenericError | OptionsError;
}

/**
 * The options type has no type-specific errors at the moment
 */
export type OptionsError = never;

/*
 * SECTION 8: Generic errors
 */

/**
 * A type-non-specific error
 *
 * @Category Generic errors
 */
export type GenericError =
  | UserDefinedTypeNotFoundError
  | IndexedReferenceTypeError
  | ReadError;

/**
 * A read error
 *
 * @Category Generic errors
 */
export type ReadError =
  | UnsupportedConstantError
  | ReadErrorStack
  | ReadErrorBytes
  | ReadErrorStorage
  | UnusedImmutableError;

/**
 * An error resulting from overlarge length or pointer values
 *
 * @Category Generic errors
 */
export type DynamicDataImplementationError =
  | OverlongArraysAndStringsNotImplementedError
  | OverlargePointersNotImplementedError;

/**
 * An error that may occur in a component other than the main
 * core of the decoder itself and thus may need to get thrown to it
 *
 * @Category Generic errors
 */
export type ErrorForThrowing = UserDefinedTypeNotFoundError | ReadError;

/**
 * Used when decoding an indexed parameter of reference (or tuple) type.  These
 * can't meaningfully be decoded, so instead they decode to an error, sorry.
 *
 * @Category Generic errors
 */
export interface IndexedReferenceTypeError {
  kind: "IndexedReferenceTypeError";
  type: Types.ReferenceType | Types.TupleType;
  /**
   * hex string
   */
  raw: string;
}

/**
 * An error for when can't find the definition info for a user-defined type
 *
 * @Category Generic errors
 */
export interface UserDefinedTypeNotFoundError {
  kind: "UserDefinedTypeNotFoundError";
  type: Types.UserDefinedType;
}

/**
 * An error for an unsupported type of constant (this counts as a read error)
 *
 * @Category Generic errors
 */
export interface UnsupportedConstantError {
  kind: "UnsupportedConstantError";
  definition: Ast.AstNode;
}

/**
 * Read error on the stack
 *
 * @Category Generic errors
 */
export interface ReadErrorStack {
  kind: "ReadErrorStack";
  from: number;
  to: number;
}

/**
 * A byte-based location
 */
export type BytesLocation =
  | "memory"
  | "calldata"
  | "eventdata"
  | "returndata"
  | "code";

/**
 * Read error in a byte-based location (memory, calldata, etc)
 *
 * @Category Generic errors
 */
export interface ReadErrorBytes {
  kind: "ReadErrorBytes";
  location: BytesLocation;
  start: number;
  length: number;
}

/**
 * Read error in storage
 *
 * @Category Generic errors
 */
export interface ReadErrorStorage {
  kind: "ReadErrorStorage";
  range: Storage.Range;
}

/**
 * Attempting to read an immutable that is never stored anywhere
 *
 * @Category Generic errors
 */
export interface UnusedImmutableError {
  kind: "UnusedImmutableError";
}

/**
 * Error for array/string/bytestring having length bigger than a JS number
 *
 * @Category Generic errors
 */
export interface OverlongArraysAndStringsNotImplementedError {
  kind: "OverlongArraysAndStringsNotImplementedError";
  lengthAsBN: BN;
  dataLength?: number; //only included when the special strict mode check fails
}

/**
 * Error for dynamic type being represented by pointer bigger than a JS number
 *
 * @Category Generic errors
 */
export interface OverlargePointersNotImplementedError {
  kind: "OverlargePointersNotImplementedError";
  pointerAsBN: BN;
}

/* SECTION 9: Internal use errors */
/* you should never see these returned.
 * they are only for internal use. */

/**
 * Internal-use error
 *
 * @Category Internal-use errors
 */
export type InternalUseError =
  | OverlongArrayOrStringStrictModeError
  | InternalFunctionInABIError;

/**
 * Error for the stricter length check in strict mode
 *
 * @Category Internal-use errors
 */
export interface OverlongArrayOrStringStrictModeError {
  kind: "OverlongArrayOrStringStrictModeError";
  lengthAsBN: BN;
  dataLength: number;
}

/**
 * This should never come up, but just to be sure...
 *
 * @Category Internal-use errors
 */
export interface InternalFunctionInABIError {
  kind: "InternalFunctionInABIError";
}

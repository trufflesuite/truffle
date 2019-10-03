import debugModule from "debug";
const debug = debugModule("codec:format:errors");

//error counterpart to values.ts

//Note: Many of the errors defined here deliberately *don't* extend Error.
//This is because they're not for throwing.  If you want to throw one,
//wrap it in a DecodingError.

import BN from "bn.js";
import * as Types from "./types";
import * as Ast from "@truffle/codec/types/ast";
import { Range } from "@truffle/codec/types/storage";

/*
 * SECTION 1: Generic types for values in general (including errors).
 */

export type ErrorResult = ElementaryErrorResult
  | ArrayErrorResult | MappingErrorResult | StructErrorResult | MagicErrorResult | TupleErrorResult
  | EnumErrorResult
  | ContractErrorResult | FunctionExternalErrorResult | FunctionInternalErrorResult;

export type DecoderError = GenericError
  | UintError | IntError | BoolError | BytesStaticError | BytesDynamicError | AddressError
  | StringError | FixedError | UfixedError
  | ArrayError | MappingError | StructError | MagicError | TupleError
  | EnumError | ContractError | FunctionExternalError | FunctionInternalError
  | InternalUseError;

/*
 * SECTION 2: Elementary values
 */

export type ElementaryErrorResult = UintErrorResult | IntErrorResult | BoolErrorResult
  | BytesErrorResult | AddressErrorResult | StringErrorResult
  | FixedErrorResult | UfixedErrorResult;
export type BytesErrorResult = BytesStaticErrorResult | BytesDynamicErrorResult;

//Uints
export interface UintErrorResult {
  type: Types.UintType;
  kind: "error";
  error: GenericError | UintError;
}

export type UintError = UintPaddingError;

export interface UintPaddingError {
  raw: string; //hex string
  kind: "UintPaddingError";
}

//Ints
export interface IntErrorResult {
  type: Types.IntType;
  kind: "error";
  error: GenericError | IntError;
}

export type IntError = IntPaddingError;

export interface IntPaddingError {
  raw: string; //hex string
  kind: "IntPaddingError";
}

//Bools
export interface BoolErrorResult {
  type: Types.BoolType;
  kind: "error";
  error: GenericError | BoolError;
}

export type BoolError = BoolOutOfRangeError;

export interface BoolOutOfRangeError {
  rawAsBN: BN;
  kind: "BoolOutOfRangeError";
}

//bytes (static)
export interface BytesStaticErrorResult {
  type: Types.BytesTypeStatic;
  kind: "error";
  error: GenericError | BytesStaticError;
}

export type BytesStaticError = BytesPaddingError;

export interface BytesPaddingError {
  raw: string; //should be hex string
  kind: "BytesPaddingError";
}

//bytes (dynamic)
export interface BytesDynamicErrorResult {
  type: Types.BytesTypeDynamic;
  kind: "error";
  error: GenericError | BytesDynamicError;
}

export type BytesDynamicError = DynamicDataImplementationError;

//addresses
export interface AddressErrorResult {
  type: Types.AddressType;
  kind: "error";
  error: GenericError | AddressError;
}

export type AddressError = AddressPaddingError;

export interface AddressPaddingError {
  raw: string; //should be hex string
  kind: "AddressPaddingError";
}

//strings
export interface StringErrorResult {
  type: Types.StringType;
  kind: "error";
  error: GenericError | StringError;
}

export type StringError = DynamicDataImplementationError;

//Fixed & Ufixed
export interface FixedErrorResult {
  type: Types.FixedType;
  kind: "error";
  error: GenericError | FixedError;
}
export interface UfixedErrorResult {
  type: Types.UfixedType;
  kind: "error";
  error: GenericError | UfixedError;
}

export type FixedError = FixedPaddingError;

export interface FixedPaddingError {
  raw: string; //hex string
  kind: "FixedPaddingError";
}

export type UfixedError = UfixedPaddingError;

export interface UfixedPaddingError {
  raw: string; //hex string
  kind: "UfixedPaddingError";
}

/*
 * SECTION 3: CONTAINER TYPES (including magic)
 * none of these have type-specific errors
 */

//Arrays
export interface ArrayErrorResult {
  type: Types.ArrayType;
  kind: "error";
  error: GenericError | ArrayError;
}

export type ArrayError = DynamicDataImplementationError;

//Mappings
export interface MappingErrorResult {
  type: Types.MappingType;
  kind: "error";
  error: GenericError | MappingError;
}

export type MappingError = never; //mappings have no type-specific errors

//Structs
export interface StructErrorResult {
  type: Types.StructType;
  kind: "error";
  error: GenericError | StructError;
}

export type StructError = DynamicDataImplementationError;

//Tuples
export interface TupleErrorResult {
  type: Types.TupleType;
  kind: "error";
  error: GenericError | TupleError;
}

export type TupleError = DynamicDataImplementationError;

//Magic variables
export interface MagicErrorResult {
  type: Types.MagicType;
  kind: "error";
  error: GenericError | MagicError;
}

export type MagicError = never; //neither do magic variables

/*
 * SECTION 4: ENUMS
 * (they didn't fit anywhere else :P )
 */

//Enums
export interface EnumErrorResult {
  type: Types.EnumType;
  kind: "error";
  error: GenericError | EnumError;
}

export type EnumError = EnumOutOfRangeError | EnumNotFoundDecodingError;

export interface EnumOutOfRangeError {
  kind: "EnumOutOfRangeError";
  type: Types.EnumType;
  rawAsBN: BN;
}

export interface EnumNotFoundDecodingError {
  kind: "EnumNotFoundDecodingError";
  type: Types.EnumType;
  rawAsBN: BN;
}

/*
 * SECTION 5: CONTRACTS
 */

//Contracts
export interface ContractErrorResult {
  type: Types.ContractType;
  kind: "error";
  error: GenericError | ContractError;
}

export type ContractError = ContractPaddingError;

export interface ContractPaddingError {
  raw: string; //should be hex string
  kind: "ContractPaddingError";
}

/*
 * SECTION 6: External functions
 */

//external functions
export interface FunctionExternalErrorResult {
  type: Types.FunctionExternalType;
  kind: "error";
  error: GenericError | FunctionExternalError;
}

export type FunctionExternalError = FunctionExternalNonStackPaddingError | FunctionExternalStackPaddingError;

export interface FunctionExternalNonStackPaddingError {
  raw: string; //should be hex string
  kind: "FunctionExternalNonStackPaddingError";
}

export interface FunctionExternalStackPaddingError {
  rawAddress: string;
  rawSelector: string;
  kind: "FunctionExternalStackPaddingError";
}

/*
 * SECTION 7: INTERNAL FUNCTIONS
 */

//Internal functions
export interface FunctionInternalErrorResult {
  type: Types.FunctionInternalType;
  kind: "error";
  error: GenericError | FunctionInternalError;
}

export type FunctionInternalError = FunctionInternalPaddingError | NoSuchInternalFunctionError
  | DeployedFunctionInConstructorError | MalformedInternalFunctionError;

export interface FunctionInternalPaddingError {
  raw: string; //should be hex string
  kind: "FunctionInternalPaddingError";
}

export interface NoSuchInternalFunctionError {
  kind: "NoSuchInternalFunctionError";
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

export interface DeployedFunctionInConstructorError {
  kind: "DeployedFunctionInConstructorError";
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

export interface MalformedInternalFunctionError {
  kind: "MalformedInternalFunctionError";
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

/*
 * SECTION 8: GENERIC ERRORS
 */

export type GenericError = UserDefinedTypeNotFoundError | IndexedReferenceTypeError | ReadError;
export type ReadError = UnsupportedConstantError | ReadErrorStack | ReadErrorBytes | ReadErrorStorage;
export type DynamicDataImplementationError = OverlongArraysAndStringsNotImplementedError | OverlargePointersNotImplementedError;

export type ErrorForThrowing = UserDefinedTypeNotFoundError | ReadError;

//attempted to decode an indexed parameter of reference type error
export interface IndexedReferenceTypeError {
  kind: "IndexedReferenceTypeError";
  type: Types.ReferenceType;
  raw: string; //should be hex string
}

//type-location error
export interface UserDefinedTypeNotFoundError {
  kind: "UserDefinedTypeNotFoundError";
  type: Types.UserDefinedType;
}

//Read errors
export interface UnsupportedConstantError {
  kind: "UnsupportedConstantError";
  definition: Ast.Definition;
}

export interface ReadErrorStack {
  kind: "ReadErrorStack";
  from: number;
  to: number;
}

export interface ReadErrorBytes {
  kind: "ReadErrorBytes";
  start: number;
  length: number;
}

export interface ReadErrorStorage {
  kind: "ReadErrorStorage";
  range: Range;
}

export interface OverlongArraysAndStringsNotImplementedError {
  kind: "OverlongArraysAndStringsNotImplementedError";
  lengthAsBN: BN;
  dataLength?: number; //only included when the special strict mode check fails
}

export interface OverlargePointersNotImplementedError {
  kind: "OverlargePointersNotImplementedError";
  pointerAsBN: BN;
}

/* SECTION 9: Internal use errors */
/* you should never see these returned.
 * they are only for internal use. */

export type InternalUseError = OverlongArrayOrStringStrictModeError | InternalFunctionInABIError;

export interface OverlongArrayOrStringStrictModeError {
  kind: "OverlongArrayOrStringStrictModeError";
  lengthAsBN: BN;
  dataLength: number;
}

//this one should never come up at all, but just to be sure...
export interface InternalFunctionInABIError {
  kind: "InternalFunctionInABIError";
}


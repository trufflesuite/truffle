import debugModule from "debug";
const debug = debugModule("codec-utils:types:errors");

//error counterpart to values.ts

//Note: Many of the errors defined here deliberately *don't* extend Error.
//This is because they're not for throwing.  If you want to throw one,
//wrap it in a DecodingError.

import BN from "bn.js";
import { Types } from "./types";
import { InspectOptions } from "./inspect";
import util from "util";
import { AstDefinition } from "../ast";
import { Definition as DefinitionUtils } from "../definition";

export namespace Errors {

  /*
   * SECTION 1: Generic types for values in general (including errors).
   */

  //For when we need to throw an error, here's a wrapper class that extends Error.
  //Apologies about the confusing name, but I wanted something that would make
  //sense should it not be caught and thus accidentally exposed to the outside.
  export class DecodingError extends Error{
    error: ErrorForThrowing;
    constructor(error: ErrorForThrowing) {
      super(message(error));
      this.error = error;
      this.name = "DecodingError";
    }
  }

  export type ErrorResult = ElementaryErrorResult
    | ArrayErrorResult | MappingErrorResult | StructErrorResult | MagicErrorResult
    | EnumErrorResult
    | ContractErrorResult | FunctionExternalErrorResult | FunctionInternalErrorResult;

  export type DecoderError = GenericError
    | UintError | IntError | BoolError | BytesStaticError | BytesDynamicError | AddressError
    | StringError | FixedError | UfixedError
    | ArrayError | MappingError | StructError | MagicError
    | EnumError | ContractError | FunctionExternalError | FunctionInternalError
    | InternalUseError;
  //note that at the moment, no reference type has its own error category, so
  //no reference types are listed here; this also includes Magic

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

  export type BoolError = BoolPaddingError | BoolOutOfRangeError;

  export interface BoolPaddingError {
    raw: string; //should be hex string
    kind: "BoolPaddingError";
  }

  export interface BoolOutOfRangeError {
    rawAsNumber: number;
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

  export type BytesDynamicError = never; //bytes dynamic has no specific errors atm

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

  export type StringError = never; //again, string has no specific errors

  //Fixed & Ufixed
  //These don't have a value format yet, so they just decode to errors for now!
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

  export type FixedError = FixedPointNotYetSupportedError;
  export type UfixedError = FixedPointNotYetSupportedError;

  export interface FixedPointNotYetSupportedError {
    raw: string; //hex string
    kind: "FixedPointNotYetSupportedError";
  }
  //no separate padding error here, that would be pointless right now; will make later

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

  export type ArrayError = never;

  //Mappings
  export interface MappingErrorResult {
    type: Types.MappingType;
    kind: "error";
    error: GenericError | MappingError;
  }

  export type MappingError = never;

  //Structs
  export interface StructErrorResult {
    type: Types.StructType;
    kind: "error";
    error: GenericError | StructError;
  }

  export type StructError = never;

  //Tuples
  export interface TupleErrorResult {
    type: Types.TupleType;
    kind: "error";
    error: GenericError | TupleError;
  }

  export type TupleError = never;

  //Magic variables
  export interface MagicErrorResult {
    type: Types.MagicType;
    kind: "error";
    error: GenericError | MagicError;
  }

  export type MagicError = never;

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

  export type EnumError = EnumPaddingError | EnumOutOfRangeError | EnumNotFoundDecodingError;

  export interface EnumPaddingError {
    kind: "EnumPaddingError";
    type: Types.EnumType;
    raw: string; //should be hex string
  }

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

  export type GenericError = UserDefinedTypeNotFoundError | IndexedReferenceTypeError
    | UnsupportedConstantError | ReadErrorStack;

  export type ErrorForThrowing = UserDefinedTypeNotFoundError |
    UnsupportedConstantError | ReadErrorStack;

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
    definition: AstDefinition;
  }

  export interface ReadErrorStack {
    kind: "ReadErrorStack";
    from: number;
    to: number;
  }

  //this function gives an error message
  //for those errors that are meant to possibly
  //be wrapped in a DecodingError and thrown
  export function message(error: ErrorForThrowing) {
    switch(error.kind) {
      case "UserDefinedTypeNotFoundError":
        let typeName = Types.isContractDefinedType(error.type)
          ? error.type.definingContractName + "." + error.type.typeName
          : error.type.typeName;
        return `Unknown ${error.type.typeClass} type ${typeName} of id ${error.type.id}`;
      case "UnsupportedConstantError":
        return `Unsupported constant type ${DefinitionUtils.typeClass(error.definition)}$`;
      case "ReadErrorStack":
        return `Can't read stack from position ${error.from} to ${error.to}`;
    }
  }

  /* SECTION 9: Internal use errors */

  export type InternalUseError = OverlongArrayOrStringError | InternalFunctionInABIError;

  //you should never see this returned.  this is only for internal use.
  export interface OverlongArrayOrStringError {
    kind: "OverlongArrayOrStringError";
    lengthAsBN: BN;
    dataLength: number;
  }

  //this one should never come up at all, but just to be sure...
  export interface InternalFunctionInABIError {
    kind: "InternalFunctionInABIError";
  }

}

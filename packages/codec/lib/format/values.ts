import debugModule from "debug";
const debug = debugModule("codec:format:values");

//objects for Solidity values

//Note: This is NOT intended to represent every possible value that exists
//in Solidity!  Only possible values the decoder might need to output.

//NOTE: not all of these optional fields are actually implemented. Some are
//just intended for the future.  More optional fields may be added in the
//future.

import BN from "bn.js";
import * as Types from "./types";
import * as Errors from "./errors";
import {
  ElementaryValue,
  BytesValue,
  UintValue,
  IntValue,
  BoolValue,
  BytesStaticValue,
  BytesDynamicValue,
  AddressValue,
  StringValue,
  StringValueInfo,
  StringValueInfoValid,
  StringValueInfoMalformed,
  FixedValue,
  UfixedValue
} from "./elementary";
import { Mutability } from "../types/ast";
import { FunctionAbiEntry } from "../types/abi";

export * from "./elementary";

/*
 * SECTION 1: Generic types for values in general (including errors).
 */

//This is the overall Result type.  It may encode an actual value or an error.
export type Result = ElementaryResult
  | ArrayResult | MappingResult | StructResult | TupleResult | MagicResult
  | EnumResult
  | ContractResult | FunctionExternalResult | FunctionInternalResult;
//for when you want an actual value
export type Value = ElementaryValue
  | ArrayValue | MappingValue | StructValue | TupleValue | MagicValue
  | EnumValue
  | ContractValue | FunctionExternalValue | FunctionInternalValue;

/*
 * SECTION 2: Elementary values
 */

//NOTE: for technical reasons, the actual Value type definitions have been moved
//to elementary.ts, sorry!  see there for elementary Values; this part just re-exports
//those (and defines the Result types)

//overall groupings
export type ElementaryResult = UintResult | IntResult | BoolResult
  | BytesResult | AddressResult | StringResult
  | FixedResult | UfixedResult;
export type BytesResult = BytesStaticResult | BytesDynamicResult;

//integers
export type UintResult = UintValue | Errors.UintErrorResult;

export type IntResult = IntValue | Errors.IntErrorResult;

//bools
export type BoolResult = BoolValue | Errors.BoolErrorResult;

//bytes (static & dynaic)
export type BytesStaticResult = BytesStaticValue | Errors.BytesStaticErrorResult;

export type BytesDynamicResult = BytesDynamicValue | Errors.BytesDynamicErrorResult;

//addresses
export type AddressResult = AddressValue | Errors.AddressErrorResult;

//strings & their info
export type StringResult = StringValue | Errors.StringErrorResult;

//fixed & ufixed
export type FixedResult = FixedValue | Errors.FixedErrorResult;

export type UfixedResult = UfixedValue | Errors.UfixedErrorResult;

/*
 * SECTION 3: CONTAINER TYPES (including magic)
 */

//Arrays
export type ArrayResult = ArrayValue | Errors.ArrayErrorResult;

export interface ArrayValue {
  type: Types.ArrayType;
  kind: "value";
  reference?: number; //will be used in the future for circular values
  value: Result[];
}

//Mappings
export type MappingResult = MappingValue | Errors.MappingErrorResult;

export interface MappingValue {
  type: Types.MappingType;
  kind: "value";
  //note that since mappings live in storage, a circular
  //mapping is impossible
  value: KeyValuePair[]; //order is irrelevant
  //note that key is not allowed to be an error!
}

export interface KeyValuePair {
  key: ElementaryValue; //note must be a value, not an error!
  value: Result;
}

//Structs
export type StructResult = StructValue | Errors.StructErrorResult;

export interface StructValue {
  type: Types.StructType;
  kind: "value";
  reference?: number; //will be used in the future for circular values
  value: NameValuePair[]; //these should be stored in order!
}

export interface NameValuePair {
  name: string;
  value: Result;
}

//Tuples
export type TupleResult = TupleValue | Errors.TupleErrorResult;

export interface TupleValue {
  type: Types.TupleType;
  kind: "value";
  value: OptionallyNamedValue[];
}

export interface OptionallyNamedValue {
  name?: string;
  value: Result;
}

//Magic variables
export type MagicResult = MagicValue | Errors.MagicErrorResult;

export interface MagicValue {
  type: Types.MagicType;
  kind: "value";
  //a magic variable can't be circular, duh!
  value: {
    [field: string]: Result
  };
}

/*
 * SECTION 4: ENUMS
 * (they didn't fit anywhere else :P )
 */

//Enums
export type EnumResult = EnumValue | Errors.EnumErrorResult;

export interface EnumValue {
  type: Types.EnumType;
  kind: "value";
  value: {
    name: string;
    numericAsBN: BN;
  };
};

/*
 * SECTION 5: CONTRACTS
 */

//Contracts
export type ContractResult = ContractValue | Errors.ContractErrorResult;

//Contract values have a special new type as their value: ContractValueInfo.
export interface ContractValue {
  type: Types.ContractType;
  kind: "value";
  value: ContractValueInfo;
}

//There are two types -- one for contracts whose class we can identify, and one
//for when we can't identify the class.
export type ContractValueInfo = ContractValueInfoKnown | ContractValueInfoUnknown;

//when we can identify the class
export interface ContractValueInfoKnown {
  kind: "known";
  address: string; //should be formatted as address
  //NOT an AddressResult, note
  rawAddress?: string;
  class: Types.ContractType;
  //may have more optional members defined later, but I'll leave these out for now
}

//when we can't
export interface ContractValueInfoUnknown {
  kind: "unknown";
  address: string; //should be formatted as address
  //NOT an AddressResult, note
  rawAddress?: string;
}

/*
 * SECTION 6: External functions
 */

//external functions
export type FunctionExternalResult = FunctionExternalValue | Errors.FunctionExternalErrorResult;

export interface FunctionExternalValue {
  type: Types.FunctionExternalType;
  kind: "value";
  value: FunctionExternalValueInfo;
}

//External function values come in 3 types:
export type FunctionExternalValueInfo =
  FunctionExternalValueInfoKnown //known function of known class
  | FunctionExternalValueInfoInvalid //known class, but can't locate function
  | FunctionExternalValueInfoUnknown; //can't determine class

//known function of known class
export interface FunctionExternalValueInfoKnown {
  kind: "known";
  contract: ContractValueInfoKnown;
  selector: string; //formatted as a bytes4
  abi: FunctionAbiEntry;
  //may have more optional fields added later, I'll leave these out for now
}

//known class but can't locate function
export interface FunctionExternalValueInfoInvalid {
  kind: "invalid";
  contract: ContractValueInfoKnown;
  selector: string; //formatted as a bytes4
}

//can't even locate class
export interface FunctionExternalValueInfoUnknown {
  kind: "unknown";
  contract: ContractValueInfoUnknown;
  selector: string; //formatted as a bytes4
}

/*
 * SECTION 7: INTERNAL FUNCTIONS
 */

//Internal functions
export type FunctionInternalResult = FunctionInternalValue | Errors.FunctionInternalErrorResult;

export interface FunctionInternalValue {
  type: Types.FunctionInternalType;
  kind: "value";
  value: FunctionInternalValueInfo;
}

//these also come in 3 types
export type FunctionInternalValueInfo =
  FunctionInternalValueInfoKnown //actual function
  | FunctionInternalValueInfoException //default value
  | FunctionInternalValueInfoUnknown; //decoding not supported in this context

//actual function
export interface FunctionInternalValueInfoKnown {
  kind: "function"
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
  name: string;
  definedIn: Types.ContractType;
  mutability?: Mutability;
  //may have more optional fields added later
}

//default value
export interface FunctionInternalValueInfoException {
  kind: "exception"
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

//value returned to indicate that decoding is not supported outside the debugger
export interface FunctionInternalValueInfoUnknown {
  kind: "unknown"
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

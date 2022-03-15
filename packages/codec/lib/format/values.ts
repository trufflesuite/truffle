/**
 * Contains the types for value and result objects.
 * @category Main Format
 *
 * @packageDocumentation
 */

import debugModule from "debug";
const debug = debugModule("codec:format:values");

//objects for Solidity values

//Note: This is NOT intended to represent every possible value that exists
//in Solidity!  Only possible values the decoder might need to output.

//NOTE: not all of these optional fields are actually implemented. Some are
//just intended for the future.  More optional fields may be added in the
//future.

import type * as Types from "./types";
import type * as Errors from "./errors";
import type {
  ElementaryValue,
  UintValue,
  IntValue,
  BoolValue,
  BytesStaticValue,
  BytesDynamicValue,
  BytesValue,
  AddressValue,
  StringValue,
  FixedValue,
  UfixedValue,
  EnumValue,
  UserDefinedValueTypeValue,
  ContractValue,
  ContractValueInfoKnown,
  ContractValueInfoUnknown
} from "./elementary";
import type * as Common from "@truffle/codec/common";
import type * as Abi from "@truffle/abi-utils";

export * from "./elementary"; //can't do 'export type *'

/*
 * SECTION 1: Generic types for values in neneral (including errors).
 */

/**
 * This is the overall Result type.  It may encode an actual value or an error.
 *
 * @Category General categories
 */
export type Result =
  | ElementaryResult
  | ArrayResult
  | MappingResult
  | StructResult
  | TupleResult
  | MagicResult
  | TypeResult
  | FunctionExternalResult
  | FunctionInternalResult
  | OptionsResult;

/**
 * An actual value, not an error (although if a container type it may contain errors!)
 *
 * @Category General categories
 */
export type Value =
  | ElementaryValue
  | ArrayValue
  | MappingValue
  | StructValue
  | TupleValue
  | MagicValue
  | TypeValue
  | FunctionExternalValue
  | FunctionInternalValue
  | OptionsValue;

/**
 * A value that can go in the ABI
 *
 * @Category General categories
 */
export type AbiValue =
  | UintValue
  | IntValue
  | BoolValue
  | BytesValue
  | AddressValue
  | FixedValue
  | UfixedValue
  | StringValue
  | ArrayValue
  | FunctionExternalValue
  | TupleValue;

/**
 * A result for an ABI type
 *
 * @Category General categories
 */
export type AbiResult =
  | UintResult
  | IntResult
  | BoolResult
  | BytesResult
  | AddressResult
  | FixedResult
  | UfixedResult
  | StringResult
  | ArrayResult
  | FunctionExternalResult
  | TupleResult;

/*
 * SECTION 2: Built-in elementary types
 */

//NOTE: for technical reasons, the actual Value type definitions have been moved
//to elementary.ts, sorry!  see there for elementary Values; this part just re-exports
//those (and defines the Result types)

/**
 * An elementary value or error
 *
 * @Category General categories
 */
export type ElementaryResult =
  | UintResult
  | IntResult
  | BoolResult
  | BytesResult
  | AddressResult
  | StringResult
  | FixedResult
  | UfixedResult
  | EnumResult
  | UserDefinedValueTypeResult
  | ContractResult;

/**
 * A bytestring value or error (static or dynamic)
 *
 * @Category Elementary types
 */
export type BytesResult = BytesStaticResult | BytesDynamicResult;

/**
 * An unsigned integer value or error
 *
 * @Category Elementary types
 */
export type UintResult = UintValue | Errors.UintErrorResult;

/**
 * A signed integer value or error
 *
 * @Category Elementary types
 */
export type IntResult = IntValue | Errors.IntErrorResult;

/**
 * A boolean value or error
 *
 * @Category Elementary types
 */
export type BoolResult = BoolValue | Errors.BoolErrorResult;

/**
 * A bytestring value or error (static-length)
 *
 * @Category Elementary types
 */
export type BytesStaticResult =
  | BytesStaticValue
  | Errors.BytesStaticErrorResult;

/**
 * A bytestring value or error (dynamic-length)
 *
 * @Category Elementary types
 */
export type BytesDynamicResult =
  | BytesDynamicValue
  | Errors.BytesDynamicErrorResult;

/**
 * An address value or error
 *
 * @Category Elementary types
 */
export type AddressResult = AddressValue | Errors.AddressErrorResult;

/**
 * A string value or error
 *
 * @Category Elementary types
 */
export type StringResult = StringValue | Errors.StringErrorResult;

/**
 * A signed fixed-point value or error
 *
 * @Category Elementary types
 */
export type FixedResult = FixedValue | Errors.FixedErrorResult;

/**
 * An unsigned fixed-point value or error
 *
 * @Category Elementary types
 */
export type UfixedResult = UfixedValue | Errors.UfixedErrorResult;

/*
 * SECTION 3: User-defined elementary types
 */

/**
 * An enum value or error
 *
 * @Category User-defined elementary types
 */
export type EnumResult = EnumValue | Errors.EnumErrorResult;

/**
 * A UDVT value or error
 *
 * @Category User-defined elementary types
 */
export type UserDefinedValueTypeResult = UserDefinedValueTypeValue | Errors.UserDefinedValueTypeErrorResult;

/**
 * A contract value or error
 *
 * @Category User-defined elementary types
 */
export type ContractResult = ContractValue | Errors.ContractErrorResult;

/*
 * SECTION 4: Container types (including magic)
 */

/**
 * An array value or error
 *
 * @Category Container types
 */
export type ArrayResult = ArrayValue | Errors.ArrayErrorResult;

/**
 * An array value (may contain errors!)
 *
 * @Category Container types
 */
export interface ArrayValue {
  type: Types.ArrayType;
  kind: "value";
  /**
   * will be used in the future for circular vales
   */
  reference?: number;
  value: Result[];
}

/**
 * A mapping value or error
 *
 * @Category Container types
 */
export type MappingResult = MappingValue | Errors.MappingErrorResult;

/**
 * A mapping value (may contain errors!)
 *
 * @Category Container types
 */
export interface MappingValue {
  type: Types.MappingType;
  kind: "value";
  //note that since mappings live in storage, a circular
  //mapping is impossible
  /**
   * order is irrelevant; also note keys must be values, not errors
   */
  value: KeyValuePair[];
}

export interface KeyValuePair {
  key: ElementaryValue; //note must be a value, not an error!
  value: Result;
}

/**
 * A struct value or error
 *
 * @Category Container types
 */
export type StructResult = StructValue | Errors.StructErrorResult;

/**
 * A struct value (may contain errors!)
 *
 * @Category Container types
 */
export interface StructValue {
  type: Types.StructType;
  kind: "value";
  /**
   * will be used in the future for circular vales
   */
  reference?: number;
  /**
   * these must be stored in order!
   * moreover, any mappings *must* be included, even
   * if this is a memory struct (such mappings will be empty)
   */
  value: NameValuePair[];
}

export interface NameValuePair {
  name: string;
  value: Result;
}

/**
 * A tuple value or error
 *
 * @Category Container types
 */
export type TupleResult = TupleValue | Errors.TupleErrorResult;

/**
 * A tuple value (may contain errors!)
 *
 * @Category Container types
 */
export interface TupleValue {
  type: Types.TupleType;
  kind: "value";
  value: OptionallyNamedValue[];
}

export interface OptionallyNamedValue {
  name?: string;
  value: Result;
}

/**
 * A magic variable's value (or error)
 *
 * @Category Special container types (debugger-only)
 */
export type MagicResult = MagicValue | Errors.MagicErrorResult;

/**
 * A magic variable's value (may contain errors?)
 *
 * @Category Special container types (debugger-only)
 */
export interface MagicValue {
  type: Types.MagicType;
  kind: "value";
  //a magic variable can't be circular, duh!
  value: {
    [field: string]: Result;
  };
}

/**
 * A type's value (or error); currently only allows contract types and
 * enum types
 *
 * @Category Special container types (debugger-only)
 */
export type TypeResult = TypeValue | Errors.TypeErrorResult;

/**
 * A type's value -- for now, we consider the value of a contract type to
 * consist of the values of its non-inherited state variables in the current
 * context, and the value of an enum type to be an array of its possible options
 * (as Values).  May contain errors.
 *
 * @Category Special container types (debugger-only)
 */
export type TypeValue = TypeValueContract | TypeValueEnum;

/**
 * A contract type's value (see [[TypeValue]])
 *
 * @Category Special container types (debugger-only)
 */
export interface TypeValueContract {
  type: Types.TypeTypeContract;
  kind: "value";
  /**
   * these must be stored in order!
   */
  value: NameValuePair[];
}

/**
 * An enum type's value (see [[TypeValue]])
 *
 * @Category Special container types (debugger-only)
 */
export interface TypeValueEnum {
  type: Types.TypeTypeEnum;
  kind: "value";
  /**
   * these must be stored in order!
   */
  value: EnumValue[];
}

/*
 * SECTION 5: External functions
 */

/**
 * An external function pointer value or error
 *
 * @Category Function types
 */
export type FunctionExternalResult =
  | FunctionExternalValue
  | Errors.FunctionExternalErrorResult;

/**
 * An external function pointer value; see [[FunctionExternalValueInfo]] for more detail
 *
 * @Category Function types
 */
export interface FunctionExternalValue {
  type: Types.FunctionExternalType;
  kind: "value";
  value: FunctionExternalValueInfo;
}

/**
 * External function values come in 3 types:
 * 1. known function of known class
 * 2. known class, but can't locate function
 * 3. can't determine class
 *
 * @Category Function types
 */
export type FunctionExternalValueInfo =
  | FunctionExternalValueInfoKnown //known function of known class
  | FunctionExternalValueInfoInvalid //known class, but can't locate function
  | FunctionExternalValueInfoUnknown; //can't determine class

/**
 * This type of FunctionExternalValueInfo is used for a known function of a known class.
 *
 * @Category Function types
 */
export interface FunctionExternalValueInfoKnown {
  kind: "known";
  contract: ContractValueInfoKnown;
  /**
   * formatted as a hex string
   */
  selector: string;
  abi: Abi.FunctionEntry;
  //may have more optional fields added later, I'll leave these out for now
}

/**
 * This type of FunctionExternalValueInfo is used when we can identify the class but can't locate the function.
 *
 * @Category Function types
 */
export interface FunctionExternalValueInfoInvalid {
  kind: "invalid";
  contract: ContractValueInfoKnown;
  /**
   * formatted as a hex string
   */
  selector: string;
}

/**
 * This type of FunctionExternalValueInfo is used when we can't even locate the class.
 *
 * @Category Function types
 */
export interface FunctionExternalValueInfoUnknown {
  kind: "unknown";
  contract: ContractValueInfoUnknown;
  /**
   * formatted as a hex string
   */
  selector: string;
}

/*
 * SECTION 6: Internal functions
 */

/**
 * An internal function pointer value or error
 *
 * @Category Function types
 */
export type FunctionInternalResult =
  | FunctionInternalValue
  | Errors.FunctionInternalErrorResult;

/**
 * An internal function pointer value; see [[FunctionInternalValueInfo]] for more detail
 *
 * @Category Function types
 */
export interface FunctionInternalValue {
  type: Types.FunctionInternalType;
  kind: "value";
  value: FunctionInternalValueInfo;
}

/**
 * Internal functions come in three types:
 * 1. An actual function,
 * 2. A default value,
 * 3. A special value to indicate that decoding internal functions isn't supported in this context.
 *
 * @Category Function types
 */
export type FunctionInternalValueInfo =
  | FunctionInternalValueInfoKnown //actual function
  | FunctionInternalValueInfoException //default value
  | FunctionInternalValueInfoUnknown; //decoding not supported in this context

/**
 * This type of FunctionInternalValueInfo is used for an actual internal function.
 *
 * @Category Function types
 */
export interface FunctionInternalValueInfoKnown {
  kind: "function";
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
  name: string;
  /**
   * Is null for a free function
   */
  definedIn: Types.ContractType | null;
  /**
   * An internal opaque ID
   */
  id: string;
  mutability?: Common.Mutability;
  //may have more optional fields added later
}

/**
 * A default value -- internal functions have two default values
 * depending on whether they live in storage or elsewhere.
 * In storage the default value is 0 for both program counters.
 * Elsewhere they're both nonzero.
 *
 * @Category Function types
 */
export interface FunctionInternalValueInfoException {
  kind: "exception";
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

/**
 * This type is used when decoding internal functions in contexts that don't
 * support full decoding of such functions.  The high-level decoding interface
 * can currently only sometimes perform such a full decoding.
 *
 * In contexts where such full decoding isn't supported, you'll get one of
 * these; so you'll still get the program counter values, but further
 * information will be absent.  Note you'll get this even if really it should
 * decode to an error, because if there's insufficient information to determine
 * additional function information, there's necessarily insufficient
 * information to determine if it should be an error.
 *
 * @Category Function types
 */
export interface FunctionInternalValueInfoUnknown {
  kind: "unknown";
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

/*
 * SECTION 7: Options
 */

/**
 * An options value or error
 *
 * @Category Special types (encoder-only)
 */
export type OptionsResult = OptionsValue | Errors.OptionsErrorResult;

/**
 * An options value
 *
 * @Category Special types (encoder-only)
 */
export interface OptionsValue {
  type: Types.OptionsType;
  kind: "value";
  value: Common.Options;
}

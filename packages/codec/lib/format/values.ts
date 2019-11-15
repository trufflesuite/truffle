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
  UintValue,
  IntValue,
  BoolValue,
  BytesStaticValue,
  BytesDynamicValue,
  AddressValue,
  StringValue,
  FixedValue,
  UfixedValue
} from "./elementary";
import * as Common from "@truffle/codec/common";
import * as AbiData from "@truffle/codec/abi-data/types";

export * from "./elementary";

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
  | EnumResult
  | ContractResult
  | FunctionExternalResult
  | FunctionInternalResult;
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
  | EnumValue
  | ContractValue
  | FunctionExternalValue
  | FunctionInternalValue;

/*
 * SECTION 2: Elementary values
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
  | UfixedResult;
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
 * SECTION 3: CONTAINER TYPES (including magic)
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
 * A type's value (or error)
 *
 * @Category Special container types (debugger-only)
 */
export type TypeResult = TypeValue | Errors.TypeErrorResult;

/**
 * A type's value -- for now, we consider the value of a contract type to
 * consist of the values of its non-inherited state variables in the current
 * context.  May contain errors.
 *
 * @Category Special container types (debugger-only)
 */
export interface TypeValue {
  type: Types.TypeType;
  kind: "value";
  /**
   * these must be stored in order!
   */
  value: NameValuePair[];
}

/*
 * SECTION 4: ENUMS
 * (they didn't fit anywhere else :P )
 */

/**
 * An enum value or error
 *
 * @Category Other user-defined types
 */
export type EnumResult = EnumValue | Errors.EnumErrorResult;

/**
 * An enum value
 *
 * @Category Other user-defined types
 */
export interface EnumValue {
  type: Types.EnumType;
  kind: "value";
  value: {
    name: string;
    /**
     * the numeric value of the enum
     */
    numericAsBN: BN;
  };
}

/*
 * SECTION 5: CONTRACTS
 */

/**
 * A contract value or error
 *
 * @Category Other user-defined types
 */
export type ContractResult = ContractValue | Errors.ContractErrorResult;

/**
 * A contract value; see [[ContractValueInfo]] for more detail
 *
 * @Category Other user-defined types
 */
export interface ContractValue {
  type: Types.ContractType;
  kind: "value";
  value: ContractValueInfo;
}

/**
 * There are two types -- one for contracts whose class we can identify, and one
 * for when we can't identify the class.
 *
 * @Category Other user-defined types
 */
export type ContractValueInfo =
  | ContractValueInfoKnown
  | ContractValueInfoUnknown;

/**
 * This type of ContractValueInfo is used when we can identify the class.
 *
 * @Category Other user-defined types
 */
export interface ContractValueInfoKnown {
  kind: "known";
  /**
   * formatted as address (leading "0x", checksum-cased);
   * note that this is not an AddressResult!
   */
  address: string;
  /**
   * this is just a hexstring; no checksum (also may have padding beforehand)
   */
  rawAddress?: string;
  class: Types.ContractType;
  //may have more optional members defined later, but I'll leave these out for now
}

/**
 * This type of ContractValueInfo is used when we can't identify the class.
 *
 * @Category Other user-defined types
 */
export interface ContractValueInfoUnknown {
  kind: "unknown";
  /**
   * formatted as address (leading "0x", checksum-cased);
   * note that this is not an AddressResult!
   */
  address: string;
  /**
   * this is just a hexstring; no checksum (also may have padding beforehand)
   */
  rawAddress?: string;
}

/*
 * SECTION 6: External functions
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
  abi: AbiData.FunctionAbiEntry;
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
 * SECTION 7: INTERNAL FUNCTIONS
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
  definedIn: Types.ContractType;
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
 * This type is used when decoding internal functions from the high-level
 * decoding interface, which presently doesn't support detailed decoding of
 * internal functions.  (The debugger, however, supports it!  You can get this
 * detailed information in the debugger!)  You'll still get the program counter
 * values, but further information will be absent.  Note you'll get this even
 * if really it should decode to an error, because the decoding interface
 * doesn't have the information to determine that it's an error.
 *
 * @Category Function types
 */
export interface FunctionInternalValueInfoUnknown {
  kind: "unknown";
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

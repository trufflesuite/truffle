import debugModule from "debug";
const debug = debugModule("codec:format:values");

//objects for Solidity values

//Note: This is NOT intended to represent every possible value that exists
//in Solidity!  Only possible values the decoder might need to output.

//NOTE: not all of these optional fields are actually implemented. Some are
//just intended for the future.  More optional fields may be added in the
//future.

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
  UfixedValue,
  EnumValue,
  ContractValue,
  ContractValueInfo,
  ContractValueInfoKnown,
  ContractValueInfoUnknown
} from "./elementary";
import * as Config from "./config";
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
export type Result<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> =
  | ElementaryResult<C>
  | ArrayResult<C>
  | MappingResult<C>
  | StructResult<C>
  | TupleResult<C>
  | MagicResult<C>
  | TypeResult<C>
  | FunctionExternalResult<C>
  | FunctionInternalResult<C>;
/**
 * An actual value, not an error (although if a container type it may contain errors!)
 *
 * @Category General categories
 */
export type Value<C extends Config.FormatConfig = Config.DefaultFormatConfig> =
  | ElementaryValue<C>
  | ArrayValue<C>
  | MappingValue<C>
  | StructValue<C>
  | TupleValue<C>
  | MagicValue<C>
  | TypeValue<C>
  | FunctionExternalValue<C>
  | FunctionInternalValue<C>;

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
export type ElementaryResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> =
  | UintResult<C>
  | IntResult<C>
  | BoolResult<C>
  | BytesResult<C>
  | AddressResult<C>
  | StringResult<C>
  | FixedResult<C>
  | UfixedResult<C>
  | EnumResult<C>
  | ContractResult<C>;

/**
 * A bytestring value or error (static or dynamic)
 *
 * @Category Elementary types
 */
export type BytesResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = BytesStaticResult<C> | BytesDynamicResult<C>;

/**
 * An unsigned integer value or error
 *
 * @Category Elementary types
 */
export type UintResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = UintValue<C> | Errors.UintErrorResult<C>;

/**
 * A signed integer value or error
 *
 * @Category Elementary types
 */
export type IntResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = IntValue<C> | Errors.IntErrorResult<C>;

/**
 * A boolean value or error
 *
 * @Category Elementary types
 */
export type BoolResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = BoolValue<C> | Errors.BoolErrorResult<C>;

/**
 * A bytestring value or error (static-length)
 *
 * @Category Elementary types
 */
export type BytesStaticResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = BytesStaticValue<C> | Errors.BytesStaticErrorResult<C>;

/**
 * A bytestring value or error (dynamic-length)
 *
 * @Category Elementary types
 */
export type BytesDynamicResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = BytesDynamicValue<C> | Errors.BytesDynamicErrorResult<C>;

/**
 * An address value or error
 *
 * @Category Elementary types
 */
export type AddressResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = AddressValue<C> | Errors.AddressErrorResult<C>;

/**
 * A string value or error
 *
 * @Category Elementary types
 */
export type StringResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = StringValue<C> | Errors.StringErrorResult<C>;

/**
 * A signed fixed-point value or error
 *
 * @Category Elementary types
 */
export type FixedResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = FixedValue<C> | Errors.FixedErrorResult<C>;

/**
 * An unsigned fixed-point value or error
 *
 * @Category Elementary types
 */
export type UfixedResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = UfixedValue<C> | Errors.UfixedErrorResult<C>;

/*
 * SECTION 3: User-defined elementary types
 */

/**
 * An enum value or error
 *
 * @Category User-defined elementary types
 */
export type EnumResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = EnumValue<C> | Errors.EnumErrorResult<C>;

/**
 * A contract value or error
 *
 * @Category User-defined elementary types
 */
export type ContractResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = ContractValue<C> | Errors.ContractErrorResult<C>;

/*
 * SECTION 4: Container types (including magic)
 */

/**
 * An array value or error
 *
 * @Category Container types
 */
export type ArrayResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = ArrayValue<C> | Errors.ArrayErrorResult<C>;

/**
 * An array value (may contain errors!)
 *
 * @Category Container types
 */
export interface ArrayValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.ArrayType<C>;
  kind: "value";
  /**
   * will be used in the future for circular vales
   */
  reference?: number;
  value: Result<C>[];
}

/**
 * A mapping value or error
 *
 * @Category Container types
 */
export type MappingResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = MappingValue<C> | Errors.MappingErrorResult<C>;

/**
 * A mapping value (may contain errors!)
 *
 * @Category Container types
 */
export interface MappingValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.MappingType<C>;
  kind: "value";
  //note that since mappings live in storage, a circular
  //mapping is impossible
  /**
   * order is irrelevant; also note keys must be values, not errors
   */
  value: KeyValuePair<C>[];
}

export interface KeyValuePair<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  key: ElementaryValue<C>; //note must be a value, not an error!
  value: Result<C>;
}

/**
 * A struct value or error
 *
 * @Category Container types
 */
export type StructResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = StructValue<C> | Errors.StructErrorResult<C>;

/**
 * A struct value (may contain errors!)
 *
 * @Category Container types
 */
export interface StructValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.StructType<C>;
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
  value: NameValuePair<C>[];
}

export interface NameValuePair<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  name: string;
  value: Result<C>;
}

/**
 * A tuple value or error
 *
 * @Category Container types
 */
export type TupleResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = TupleValue<C> | Errors.TupleErrorResult<C>;

/**
 * A tuple value (may contain errors!)
 *
 * @Category Container types
 */
export interface TupleValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.TupleType<C>;
  kind: "value";
  value: OptionallyNamedValue<C>[];
}

export interface OptionallyNamedValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  name?: string;
  value: Result<C>;
}

/**
 * A magic variable's value (or error)
 *
 * @Category Special container types (debugger-only)
 */
export type MagicResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = MagicValue<C> | Errors.MagicErrorResult<C>;

/**
 * A magic variable's value (may contain errors?)
 *
 * @Category Special container types (debugger-only)
 */
export interface MagicValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.MagicType<C>;
  kind: "value";
  //a magic variable can't be circular, duh!
  value: {
    [field: string]: Result<C>;
  };
}

/**
 * A type's value (or error)
 *
 * @Category Special container types (debugger-only)
 */
export type TypeResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = TypeValue<C> | Errors.TypeErrorResult<C>;

/**
 * A type's value -- for now, we consider the value of a contract type to
 * consist of the values of its non-inherited state variables in the current
 * context.  May contain errors.
 *
 * @Category Special container types (debugger-only)
 */
export interface TypeValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.TypeType<C>;
  kind: "value";
  /**
   * these must be stored in order!
   */
  value: NameValuePair<C>[];
}

/*
 * SECTION 5: External functions
 */

/**
 * An external function pointer value or error
 *
 * @Category Function types
 */
export type FunctionExternalResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = FunctionExternalValue<C> | Errors.FunctionExternalErrorResult<C>;

/**
 * An external function pointer value; see [[FunctionExternalValueInfo]] for more detail
 *
 * @Category Function types
 */
export interface FunctionExternalValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.FunctionExternalType<C>;
  kind: "value";
  value: FunctionExternalValueInfo<C>;
}

/**
 * External function values come in 3 types:
 * 1. known function of known class
 * 2. known class, but can't locate function
 * 3. can't determine class
 *
 * @Category Function types
 */
export type FunctionExternalValueInfo<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> =
  | FunctionExternalValueInfoKnown<C> //known function of known class
  | FunctionExternalValueInfoInvalid<C> //known class, but can't locate function
  | FunctionExternalValueInfoUnknown; //can't determine class

/**
 * This type of FunctionExternalValueInfo is used for a known function of a known class.
 *
 * @Category Function types
 */
export interface FunctionExternalValueInfoKnown<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  kind: "known";
  contract: ContractValueInfoKnown<C>;
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
export interface FunctionExternalValueInfoInvalid<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  kind: "invalid";
  contract: ContractValueInfoKnown<C>;
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
export type FunctionInternalResult<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = FunctionInternalValue<C> | Errors.FunctionInternalErrorResult<C>;

/**
 * An internal function pointer value; see [[FunctionInternalValueInfo]] for more detail
 *
 * @Category Function types
 */
export interface FunctionInternalValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.FunctionInternalType<C>;
  kind: "value";
  value: FunctionInternalValueInfo<C>;
}

/**
 * Internal functions come in three types:
 * 1. An actual function,
 * 2. A default value,
 * 3. A special value to indicate that decoding internal functions isn't supported in this context.
 *
 * @Category Function types
 */
export type FunctionInternalValueInfo<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> =
  | FunctionInternalValueInfoKnown<C> //actual function
  | FunctionInternalValueInfoException<C> //default value
  | FunctionInternalValueInfoUnknown<C>; //decoding not supported in this context

/**
 * This type of FunctionInternalValueInfo is used for an actual internal function.
 *
 * @Category Function types
 */
export interface FunctionInternalValueInfoKnown<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  kind: "function";
  context: Types.ContractType<C>;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
  name: string;
  definedIn: Types.ContractType<C>;
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
export interface FunctionInternalValueInfoException<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  kind: "exception";
  context: Types.ContractType<C>;
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
export interface FunctionInternalValueInfoUnknown<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  kind: "unknown";
  context: Types.ContractType<C>;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

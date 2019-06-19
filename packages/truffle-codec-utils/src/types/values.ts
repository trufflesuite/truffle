import debugModule from "debug";
const debug = debugModule("decode-utils:values");

//objects for Solidity values

//Note: This is NOT intended to represent every possible value that exists
//in Solidity!  Only possible values of variables.  (Though there may be
//some expansion in the future.)  We do however count the builtin variables
//msg, block, and tx as variables (not other builtins though for now) so
//there is some support for the magic type.

//We don't include fixed and ufixed for now.  Those will be added when
//implemented.

//NOTE: not all of these optional fields are actually implemented. Some are
//just intended for the future.  More optional fields may be added in the
//future.

//Note: Many of the errors defined here deliberately *don't* extend Error.
//This is because their intended use is a little different.  Only the ones
//that are for throwing extend Error.

import BN from "bn.js";
import { Types } from "./types";
import util from "util";
import { AstDefinition } from "../ast";
import { Definition as DefinitionUtils } from "../definition";

export namespace Values {

  /*
   * SECTION 0: Some irrelevant stuff for dealing with util.inspect.custom.
   * You can probably ignore these.
   */

  //we'll need to write a typing for the options type ourself, it seems; just
  //going to include the relevant properties here
  interface InspectOptions {
    stylize?: (toMaybeColor: string, style?: string) => string;
    colors: boolean;
    breakLength: number;
  }

  //HACK -- inspect options are ridiculous, I swear >_>
  function cleanStylize(options: InspectOptions) {
    return Object.assign({}, ...Object.entries(options).map(
      ([key,value]) =>
        key === "stylize"
          ? {}
          : {[key]: value}
    ));
  }

  /*
   * SECTION 1: Generic types for values in general (including errors).
   */

  //This is the overall Result type.  It may encode an actual value (Value) or
  //an error value (ErrorResult).  Every value has a type.
  //The reference field is for future use for encoding circular structures; you can
  //ignore it for now.
  //The nativize method is a HACK that you should not use except
  //A. for testing, or
  //B. if you really have to, which we unfortunately do in some cases.
  //See below for more.
  export interface Result {
    type: Types.Type;
    kind: "value" | "error";
    nativize(): any; //HACK
    //turns Result objects into Plain-Old JavaScript Objects
    //May cause errors if numeric values are too big!
    //only use this in testing or if you have no better option!
  };

  //A Value encodes an actual value, not an error.  HOWEVER, if it is a
  //container type (Array, Struct, or Mapping), it is still possible for some
  //of the individual values within it to be errors!
  //The exact type of the value field depends on the type of the Result; don't
  //worry, the more specific types will have more specific type annotations.
  export abstract class Value implements Result {
    type: Types.Type;
    kind: "value";
    value: any; //sorry -- at least it's an abstract class though!
    abstract nativize(): any;
    constructor() {
      this.kind = "value";
    }
  };

  //A ErrorResult, on the other hand, encodes an error.  Rather than a value field,
  //it has an error field, of type ErrorValueInfo.
  //See section 2 regarding the toSoliditySha3Input method.
  export abstract class ErrorResult implements Result {
    type: Types.Type;
    kind: "error";
    error: DecoderError;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.error, options);
    }
    nativize(): any {
      return undefined;
    }
    toSoliditySha3Input(): {type: string; value: any} {
      return undefined; //will cause an error! should not occur!
    }
    constructor(error: DecoderError) {
      this.kind = "error";
      this.error = error;
    }
  };

  //NOTE: the container types Array and Struct also potentially have another field,
  //reference.  This will be used in the future for circular values.

  //meanwhile, the underlying errors themselves come in two types:
  //1. errors that are specific to decoding a particular type, and
  //2. generic errors such as read errors.

  //here's the class for the error objects themselves; the only thing they require
  //is a "kind" saying what sort of error they are
  export abstract class DecoderError {
    kind: string;
  }

  //and here's the class for the generic ones specifically.
  //See section 8 for the actual generic errors.
  export abstract class GenericError extends DecoderError {
    abstract message(): string;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return this.message();
    }
  }

  //Finally, for when we need to throw an error, here's a wrapper class that extends Error.
  //Apologies about the confusing name, but I wanted something that would make
  //sense should it not be caught and thus accidentally exposed to the outside.
  export class DecodingError extends Error {
    error: GenericError;
    constructor(error: GenericError) {
      super(error.message());
      this.error = error;
      this.name = "DecodingError";
    }
  }

  /*
   * SECTION 2: Elementary values
   */

  //A key thing about elementary values is that they can be used as mapping keys,
  //and so they have a method that gives what input to soliditySha3() they correspond
  //to.  Note that errors, above, also have this method, but for them it just
  //returns undefined.
  export interface ElementaryResult extends Result {
    type: Types.ElementaryType;
    toSoliditySha3Input(): {type: string; value: any};
  }

  export abstract class ElementaryValue extends Value implements ElementaryResult {
    type: Types.ElementaryType;
    abstract toSoliditySha3Input(): {type: string; value: any};
    toString(): string {
      return this.value.toString();
    }
  }

  //Uints
  export interface UintResult extends ElementaryResult {
    type: Types.UintType;
  }

  export class UintValue extends ElementaryValue implements UintResult {
    type: Types.UintType;
    value: BN;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return options.stylize(this.value.toString(), "number");
    }
    toSoliditySha3Input() {
      return {
        type: "uint",
        value: this.value
      }
    }
    nativize() {
      return this.value.toNumber(); //beware!
    }
    constructor(uintType: Types.UintType, value: BN) {
      super();
      this.type = uintType;
      this.value = value;
    }
  }

  //errors for uints
  export class UintErrorResult extends ErrorResult implements UintResult {
    type: Types.UintType;
    constructor(uintType: Types.UintType, error: DecoderError) {
      super(error);
      this.type = uintType;
    }
  }

  export class UintPaddingError extends DecoderError {
    raw: string; //hex string
    kind: "UintPaddingError";
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `Uint has extra leading bytes (padding error) (raw value ${this.raw})`;
    }
    constructor(raw: string) {
      super();
      this.raw = raw;
      this.kind = "UintPaddingError";
    }
  }

  //Ints
  export interface IntResult extends ElementaryResult {
    type: Types.IntType;
  }

  export class IntValue extends ElementaryValue implements IntResult {
    type: Types.IntType;
    value: BN;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return options.stylize(this.value.toString(), "number");
    }
    toSoliditySha3Input() {
      return {
        type: "int",
        value: this.value
      }
    }
    nativize() {
      return this.value.toNumber(); //beware!
    }
    constructor(intType: Types.IntType, value: BN) {
      super();
      this.type = intType;
      this.value = value;
    }
  }

  //errors for ints
  export class IntErrorResult extends ErrorResult implements IntResult {
    type: Types.IntType;
    constructor(intType: Types.IntType, error: DecoderError) {
      super(error);
      this.type = intType;
    }
  }

  export class IntPaddingError extends DecoderError {
    raw: string; //hex string
    kind: "IntPaddingError";
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `Int out of range (padding error) (numeric value ${this.raw})`;
    }
    constructor(raw: string) {
      super();
      this.raw = raw;
      this.kind = "IntPaddingError";
    }
  }

  //Bools
  export interface BoolResult extends ElementaryResult {
    type: Types.BoolType;
  }

  export class BoolValue extends ElementaryValue implements BoolResult {
    type: Types.BoolType;
    value: boolean;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    toSoliditySha3Input() {
      return {
        type: "uint", //used to achieve left-padding
        value: this.value ? new BN(1) : new BN(0) //true & false won't work here
      }
    }
    nativize() {
      return this.value;
    }
    constructor(boolType: Types.BoolType, value: boolean) {
      super();
      this.type = boolType;
      this.value = value;
    }
  }

  //errors for bools
  export class BoolErrorResult extends ErrorResult implements BoolResult {
    type: Types.BoolType;
    constructor(boolType: Types.BoolType, error: DecoderError) {
      super(error);
      this.type = boolType;
    }
  }

  export class BoolPaddingError extends DecoderError {
    raw: string; //should be hex string
    kind: "BoolPaddingError";
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `Bool has extra leading bytes (padding error) (raw value ${this.raw})`;
    }
    constructor(raw: string) {
      super();
      this.raw = raw;
      this.kind = "BoolPaddingError";
    }
  }

  export class BoolOutOfRangeError extends DecoderError {
    raw: BN;
    kind: "BoolOutOfRangeError";
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `Invalid boolean (numeric value ${this.raw.toString()})`;
    }
    constructor(raw: BN) {
      super();
      this.raw = raw;
      this.kind = "BoolOutOfRangeError";
    }
  }

  //bytes
  export interface BytesResult extends ElementaryResult {
    type: Types.BytesType;
  }

  export class BytesValue extends ElementaryValue implements BytesResult {
    type: Types.BytesType;
    value: string; //should be hex-formatted, with leading "0x"
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      switch(this.type.kind) {
        case "static":
            return options.stylize(this.value, "number");
        case "dynamic":
            return options.stylize(`hex'${this.value.slice(2)}'`, "string")
      }
    }
    toSoliditySha3Input() {
      switch(this.type.kind) {
        case "static":
          return {
            type: "bytes32", //used to achieve right-padding
            value: this.value
          };
        case "dynamic":
          return {
            type: "bytes",
            value: this.value
          };
      }
    }
    nativize() {
      return this.value;
    }
    constructor(bytesType: Types.BytesType, value: string) {
      super();
      this.type = bytesType;
      this.value = value;
    }
  }

  export class BytesErrorResult extends ErrorResult implements BytesResult {
    type: Types.BytesType;
    constructor(bytesType: Types.BytesType, error: DecoderError) {
      super(error);
      this.type = bytesType;
    }
  }

  export class BytesPaddingError extends DecoderError {
    raw: string; //should be hex string
    kind: "BytesPaddingError";
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `Bytestring has extra trailing bytes (padding error) (raw value ${this.raw})`;
    }
    constructor(raw: string) {
      super();
      this.raw = raw;
      this.kind = "BytesPaddingError";
    }
  }

  //addresses
  export interface AddressResult extends ElementaryResult {
    type: Types.AddressType;
  }

  export class AddressValue extends ElementaryValue implements AddressResult {
    type: Types.AddressType;
    value: string; //should have 0x and be checksum-cased
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return options.stylize(this.value, "number");
    }
    toSoliditySha3Input() {
      return {
        type: "uint", //used to achieve left-padding
        value: this.value
      }
    }
    nativize() {
      return this.value;
    }
    constructor(addressType: Types.AddressType, value: string) {
      super();
      this.type = addressType;
      this.value = value;
    }
  }

  export class AddressErrorResult extends ErrorResult implements AddressResult {
    type: Types.AddressType;
    constructor(addressType: Types.AddressType, error: DecoderError) {
      super(error);
      this.type = addressType;
    }
  }

  export class AddressPaddingError extends DecoderError {
    raw: string; //should be hex string
    kind: "AddressPaddingError";
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `Address has extra leading bytes (padding error) (raw value ${this.raw})`;
    }
    constructor(raw: string) {
      super();
      this.raw = raw;
      this.kind = "AddressPaddingError";
    }
  }

  //strings
  export interface StringResult extends ElementaryResult {
    type: Types.StringType;
  }

  export class StringValue extends ElementaryValue {
    type: Types.StringType;
    value: string;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    toSoliditySha3Input() {
      return {
        type: "string",
        value: this.value
      }
    }
    nativize() {
      return this.value;
    }
    constructor(stringType: Types.StringType, value: string) {
      super();
      this.type = stringType;
      this.value = value;
    }
  }

  export class StringErrorResult extends ErrorResult implements StringResult {
    type: Types.StringType;
    constructor(stringType: Types.StringType, error: DecoderError) {
      super(error);
      this.type = stringType;
    }
  }
  //no padding error for strings

  //Fixed & Ufixed
  //These don't have a value format yet, so they just decode to errors for now!
  export interface FixedResult extends ElementaryResult {
    type: Types.FixedType;
  }
  export interface UfixedResult extends ElementaryResult {
    type: Types.UfixedType;
  }

  export class FixedErrorResult extends ErrorResult implements FixedResult {
    type: Types.FixedType;
    constructor(fixedType: Types.FixedType, error: DecoderError) {
      super(error);
      this.type = fixedType;
    }
  }
  export class UfixedErrorResult extends ErrorResult implements UfixedResult {
    type: Types.UfixedType;
    constructor(ufixedType: Types.UfixedType, error: DecoderError) {
      super(error);
      this.type = ufixedType;
    }
  }

  export class FixedPointNotYetSupportedError extends DecoderError {
    raw: string; //hex string
    kind: "FixedPointNotYetSupportedError";
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `Fixed-point decoding not yet supported (raw value: ${this.raw})`;
    }
    constructor(raw: string) {
      super();
      this.raw = raw;
      this.kind = "FixedPointNotYetSupportedError";
    }
  }
  //no separate padding error here, that would be pointless right now; will make later

  //Function for wrapping a value as an ElementaryValue
  //WARNING: this function does not check its inputs! Please check before using!
  //How to use:
  //numbers may be BN, number, or numeric string
  //strings should be given as strings. duh.
  //bytes should be given as hex strings beginning with "0x"
  //addresses are like bytes; checksum case is not required
  //booleans may be given either as booleans, or as string "true" or "false"
  export function wrapElementaryValue(value: any, definition: AstDefinition): ElementaryValue {
    //force location to undefined, force address to nonpayable
    //(we force address to nonpayable since address payable can't be declared
    //as a mapping key type)
    let dataType = Types.definitionToType(definition, null, null);
    switch(dataType.typeClass) {
      case "string":
        return new StringValue(dataType, value);
      case "bytes":
        return new BytesValue(dataType, value);
      case "address":
        return new AddressValue(dataType, value);
      case "int":
        if(value instanceof BN) {
          value = value.clone();
        }
        else {
          value = new BN(value);
        }
        return new IntValue(dataType, value);
      case "uint":
        if(value instanceof BN) {
          value = value.clone();
        }
        else {
          value = new BN(value);
        }
        return new UintValue(dataType, value);
      case "bool":
        if(typeof value === "string") {
          value = value !== "false";
        }
        return new BoolValue(dataType, value);
    }
  }

  /*
   * SECTION 3: CONTAINER TYPES (including magic)
   */

  //this function will be used in the future for displaying circular
  //structures
  function formatCircular(loopLength: number, options: InspectOptions) {
    return options.stylize(`[Circular (=up ${this.loopLength})]`, "special");
  }

  //Arrays
  export interface ArrayResult extends Result {
    type: Types.ArrayType;
  }

  export class ArrayValue extends Value implements ArrayResult {
    type: Types.ArrayType;
    reference?: number; //will be used in the future for circular values
    value: Result[];
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      if(this.reference !== undefined) {
        return formatCircular(this.reference, options);
      }
      return util.inspect(this.value, options)
    }
    nativize() {
      return this.value.map(element => element.nativize());
    }
    constructor(arrayType: Types.ArrayType, value: Result[], reference?: number) {
      super();
      this.type = arrayType;
      this.value = value;
      this.reference = reference;
    }
  }

  export class ArrayErrorResult extends ErrorResult implements ArrayResult {
    type: Types.ArrayType;
    constructor(arrayType: Types.ArrayType, error: DecoderError) {
      super(error);
      this.type = arrayType;
    }
  }

  //Mappings
  export interface MappingResult extends Result {
    type: Types.MappingType;
  }

  export class MappingValue extends Value implements MappingResult {
    type: Types.MappingType;
    //note that since mappings live in storage, a circular
    //mapping is impossible
    value: [ElementaryResult, Result][]; //order of key-value pairs is irrelevant
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(new Map(this.value), options);
    }
    nativize() {
      //if only I could use Object.fromEntries() here!
      return Object.assign({}, ...this.value.map(([key, value]) =>
        ({[key.toString()]: value.nativize()})
      ));
    }
    constructor(mappingType: Types.MappingType, value: [ElementaryResult, Result][]) {
      super();
      this.type = mappingType;
      this.value = value;
    }
  }

  export class MappingErrorResult extends ErrorResult implements MappingResult {
    type: Types.MappingType;
    constructor(mappingType: Types.MappingType, error: DecoderError) {
      super(error);
      this.type = mappingType;
    }
  }

  //Structs
  export interface StructResult extends Result {
    type: Types.StructType;
  }

  export class StructValue extends Value implements StructResult {
    type: Types.StructType;
    reference?: number; //will be used in the future for circular values
    value: [string, Result][]; //these should be stored in order!
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      if(this.reference !== undefined) {
        return formatCircular(this.reference, options);
      }
      return util.inspect(
        Object.assign({}, ...this.value.map(
          ([key, value]) => ({[key]: value})
        )),
        options
      );
    }
    nativize() {
      return Object.assign({}, ...this.value.map(
        ([key, value]) => ({[key]: value.nativize()})
      ));
    }
    constructor(structType: Types.StructType, value: [string, Result][], reference?: number) {
      super();
      this.type = structType;
      this.value = value;
      this.reference = reference;
    }
  }

  export class StructErrorResult extends ErrorResult implements StructResult {
    type: Types.StructType;
    constructor(structType: Types.StructType, error: DecoderError) {
      super(error);
      this.type = structType;
    }
  }

  //Magic variables
  export interface MagicResult extends Result {
    type: Types.MagicType;
  }

  export class MagicValue extends Value implements MagicResult {
    type: Types.MagicType;
    //a magic variable can't be circular, duh!
    value: {
      [field: string]: Result
    };
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    nativize() {
      return Object.assign({}, ...Object.entries(this.value).map(
        ([key, value]) => ({[key]: value.nativize()})
      ));
    }
    constructor(magicType: Types.MagicType, value: {[field: string]: Result}) {
      super();
      this.type = magicType;
      this.value = value;
    }
  }

  export class MagicErrorResult extends ErrorResult implements MagicResult {
    type: Types.MagicType;
    constructor(magicType: Types.MagicType, error: DecoderError) {
      super(error);
      this.type = magicType;
    }
  }

  /*
   * SECTION 4: ENUMS
   * (they didn't fit anywhere else :P )
   */

  //Enums
  export interface EnumResult extends Result {
    type: Types.EnumType;
  }

  export class EnumValue extends Value implements EnumResult {
    type: Types.EnumType;
    value: {
      name: string;
      numeric: BN;
    };
    fullName(): string {
      return `${this.type.definingContractName}.${this.type.typeName}.${this.value.name}`;
    }
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return this.fullName();
    }
    nativize() {
      return this.fullName();
    }
    constructor(enumType: Types.EnumType, numeric: BN, name: string) {
      super();
      this.type = enumType;
      this.value = { name, numeric };
    }
  };

  //Enum errors
  export class EnumErrorResult extends ErrorResult implements EnumResult {
    type: Types.EnumType;
    constructor(enumType: Types.EnumType, error: DecoderError) {
      super(error);
      this.type = enumType;
    }
  }

  export class EnumPaddingError extends DecoderError {
    kind: "EnumPaddingError";
    type: Types.EnumType;
    raw: string; //should be hex string
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      let typeName = this.type.definingContractName + "." + this.type.typeName;
      return `${typeName} has extra leading bytes (padding error) (raw value ${this.raw})`;
    }
    constructor(enumType: Types.EnumType, raw: string) {
      super();
      this.type = enumType;
      this.raw = raw;
      this.kind = "EnumPaddingError";
    }
  }

  export class EnumOutOfRangeError extends DecoderError {
    kind: "EnumOutOfRangeError";
    type: Types.EnumType;
    raw: BN;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      let typeName = this.type.definingContractName + "." + this.type.typeName;
      return `Invalid ${typeName} (numeric value ${this.raw.toString()})`;
    }
    constructor(enumType: Types.EnumType, raw: BN) {
      super();
      this.type = enumType;
      this.raw = raw;
      this.kind = "EnumOutOfRangeError";
    }
  }

  export class EnumNotFoundDecodingError extends DecoderError {
    kind: "EnumNotFoundDecodingError";
    type: Types.EnumType;
    raw: BN;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      let typeName = this.type.definingContractName + "." + this.type.typeName;
      return `Unknown enum type ${typeName} of id ${this.type.id} (numeric value ${this.raw.toString()})`;
    }
    constructor(enumType: Types.EnumType, raw: BN) {
      super();
      this.type = enumType;
      this.raw = raw;
      this.kind = "EnumNotFoundDecodingError";
    }
  }

  /*
   * SECTION 5: CONTRACTS
   */

  //Contracts
  export interface ContractResult extends Result {
    type: Types.ContractType;
  }

  //Contract values have a special new type as their value: ContractValueInfo.
  export class ContractValue extends Value implements ContractResult {
    type: Types.ContractType;
    value: ContractValueInfo;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    nativize() {
      return this.value.nativize();
    }
    constructor(contractType: Types.ContractType, value: ContractValueInfo) {
      super();
      this.type = contractType;
      this.value = value;
    }
  }

  //There are two types -- one for contracts whose class we can identify, and one
  //for when we can't identify the class.
  export type ContractValueInfo = ContractValueInfoKnown | ContractValueInfoUnknown;

  //when we can identify the class
  export class ContractValueInfoKnown {
    address: string; //should be formatted as address
    //NOT an AddressResult, note
    kind: "known";
    class: Types.ContractType;
    //may have more optional members defined later, but I'll leave these out for now
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return options.stylize(this.address, "number") + ` (${this.class.typeName})`;
    }
    nativize() {
      return `${this.class.typeName}(${this.address})`;
    }
    constructor(address: string, contractClass: Types.ContractType) {
      this.kind = "known";
      this.address = address;
      this.class = contractClass;
    }
  }

  //when we can't
  export class ContractValueInfoUnknown {
    address: string; //should be formatted as address
    //NOT an AddressResult, note
    kind: "unknown";
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      debug("options: %O", options);
      return options.stylize(this.address, "number") + " of unknown class";
    }
    nativize() {
      return this.address;
    }
    constructor(address: string) {
      this.kind = "unknown";
      this.address = address;
    }
  }

  //errors for contracts
  export class ContractErrorResult extends ErrorResult implements ContractResult {
    type: Types.ContractType;
    constructor(contractType: Types.ContractType, error: DecoderError) {
      super(error);
      this.type = contractType;
    }
  }

  export class ContractPaddingError extends DecoderError {
    raw: string; //should be hex string
    kind: "ContractPaddingError";
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `Contract address has extra leading bytes (padding error) (raw value ${this.raw})`;
    }
    constructor(raw: string) {
      super();
      this.raw = raw;
      this.kind = "ContractPaddingError";
    }
  }

  /*
   * SECTION 6: External functions
   */

  //external functions
  export interface FunctionExternalResult extends Result {
    type: Types.FunctionType; //should be external, obviously!
  }

  export class FunctionExternalValue extends Value implements FunctionExternalResult {
    type: Types.FunctionType;
    value: FunctionExternalValueInfo;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    nativize() {
      return this.value.nativize();
    }
    constructor(functionType: Types.FunctionType, value: FunctionExternalValueInfo) {
      super();
      this.type = functionType;
      this.value = value;
    }
  }

  //External function values come in 3 types:
  export type FunctionExternalValueInfo =
    FunctionExternalValueInfoKnown //known function of known class
    | FunctionExternalValueInfoInvalid //known class, but can't locate function
    | FunctionExternalValueInfoUnknown; //can't determine class

  //known function of known class
  export class FunctionExternalValueInfoKnown {
    kind: "known";
    contract: ContractValueInfoKnown;
    selector: string; //formatted as a bytes4
    name: string;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      //first, let's inspect that contract, but w/o color
      let contractString = util.inspect(this.contract, { ...cleanStylize(options), colors: false });
      let firstLine = `[Function: ${this.name} of`;
      let secondLine = `${contractString}]`;
      let breakingSpace = firstLine.length >= options.breakLength ? "\n" : " ";
      //now, put it together
      return options.stylize(firstLine + breakingSpace + secondLine, "special");
    }
    nativize() {
      return `${this.contract.nativize()}.${this.name}`
    }
    constructor(contract: ContractValueInfoKnown, selector: string, name: string) {
      this.kind = "known";
      this.contract = contract;
      this.selector = selector;
      this.name = name;
    }
  }

  //known class but can't locate function
  export class FunctionExternalValueInfoInvalid {
    kind: "invalid";
    contract: ContractValueInfoKnown;
    selector: string; //formatted as a bytes4
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      //first, let's inspect that contract, but w/o color
      let contractString = util.inspect(this.contract, { ...cleanStylize(options), colors: false });
      let selectorString = `Unknown selector 0x${this.selector}`;
      let firstLine = `[Function: ${selectorString} of`;
      let secondLine = `${contractString}]`;
      let breakingSpace = firstLine.length >= options.breakLength ? "\n" : " ";
      //now, put it together
      return options.stylize(firstLine + breakingSpace + secondLine, "special");
    }
    nativize() {
      return `${this.contract.nativize()}.call(${this.selector}...)`
    }
    constructor(contract: ContractValueInfoKnown, selector: string) {
      this.kind = "invalid";
      this.contract = contract;
      this.selector = selector;
    }
  }

  //can't even locate class
  export class FunctionExternalValueInfoUnknown {
    kind: "unknown";
    contract: ContractValueInfoUnknown;
    selector: string; //formatted as a bytes4
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      //first, let's inspect that contract, but w/o color
      let contractString = util.inspect(this.contract, { ...cleanStylize(options), colors: false });
      let selectorString = `Unknown selector 0x${this.selector}`;
      let firstLine = `[Function: ${selectorString} of`;
      let secondLine = `${contractString}]`;
      let breakingSpace = firstLine.length >= options.breakLength ? "\n" : " ";
      //now, put it together
      return options.stylize(firstLine + breakingSpace + secondLine, "special");
    }
    nativize() {
      return `${this.contract.nativize()}.call(${this.selector}...)`
    }
    constructor(contract: ContractValueInfoUnknown, selector: string) {
      this.kind = "unknown";
      this.contract = contract;
      this.selector = selector;
    }
  }

  //errors for external functions
  export class FunctionExternalErrorResult extends ErrorResult implements FunctionExternalResult {
    type: Types.FunctionType;
    constructor(functionType: Types.FunctionType, error: DecoderError) {
      super(error);
      this.type = functionType;
    }
  }

  export class FunctionExternalNonStackPaddingError extends DecoderError {
    raw: string; //should be hex string
    kind: "FunctionExternalNonStackPaddingError";
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `External function has extra trailing bytes (padding error) (raw value ${this.raw})`;
    }
    constructor(raw: string) {
      super();
      this.raw = raw;
      this.kind = "FunctionExternalNonStackPaddingError";
    }
  }

  export class FunctionExternalStackPaddingError extends DecoderError {
    rawAddress: string;
    rawSelector: string;
    kind: "FunctionExternalStackPaddingError";
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `External function address or selector has extra leading bytes (padding error) (raw address ${this.rawAddress}, raw selector ${this.rawSelector})`;
    }
    constructor(rawAddress: string, rawSelector: string) {
      super();
      this.rawAddress = rawAddress;
      this.rawSelector = rawSelector;
      this.kind = "FunctionExternalStackPaddingError";
    }
  }

  /*
   * SECTION 7: INTERNAL FUNCTIONS
   */

  //Internal functions
  export interface FunctionInternalResult extends Result {
    type: Types.FunctionType; //should be internal, obviously!
  }

  export class FunctionInternalValue extends Value implements FunctionInternalResult {
    type: Types.FunctionType;
    value: FunctionInternalValueInfo;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    nativize() {
      return this.value.nativize();
    }
    constructor(functionType: Types.FunctionType, value: FunctionInternalValueInfo) {
      super();
      this.type = functionType;
      this.value = value;
    }
  }

  //these also come in 3 types
  export type FunctionInternalValueInfo =
    FunctionInternalValueInfoKnown //actual function
    | FunctionInternalValueInfoException //default value
    | FunctionInternalValueInfoUnknown; //decoding not supported in this context

  //actual function
  export class FunctionInternalValueInfoKnown {
    kind: "function"
    context: Types.ContractType;
    deployedProgramCounter: number;
    constructorProgramCounter: number;
    name: string;
    definedIn: Types.ContractType;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return options.stylize(`[Function: ${this.definedIn.typeName}.${this.name}]`, "special");
    }
    nativize() {
      return `${this.definedIn.typeName}.${this.name}`;
    }
    constructor(
      context: Types.ContractType,
      deployedProgramCounter: number,
      constructorProgramCounter: number,
      name: string,
      definedIn: Types.ContractType
    ) {
      this.kind = "function";
      this.context = context;
      this.deployedProgramCounter = deployedProgramCounter;
      this.constructorProgramCounter = constructorProgramCounter;
      this.name = name;
      this.definedIn = definedIn;
    }
  }

  //default value
  export class FunctionInternalValueInfoException {
    kind: "exception"
    context: Types.ContractType;
    deployedProgramCounter: number;
    constructorProgramCounter: number;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return this.deployedProgramCounter === 0
        ? options.stylize(`[Function: <zero>]`, "special")
        : options.stylize(`[Function: assert(false)]`, "special");
    }
    nativize() {
      return this.deployedProgramCounter === 0
        ? `<zero>`
        : `assert(false)`;
    }
    constructor(
      context: Types.ContractType,
      deployedProgramCounter: number,
      constructorProgramCounter: number
    ) {
      this.kind = "exception";
      this.context = context;
      this.deployedProgramCounter = deployedProgramCounter;
      this.constructorProgramCounter = constructorProgramCounter;
    }
  }

  //value returned to indicate that decoding is not supported outside the debugger
  export class FunctionInternalValueInfoUnknown {
    kind: "unknown"
    context: Types.ContractType;
    deployedProgramCounter: number;
    constructorProgramCounter: number;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return options.stylize(`[Function: decoding not supported (raw info: deployed PC=${this.deployedProgramCounter}, constructor PC=${this.constructorProgramCounter})]`, "special");
    }
    nativize() {
      return `<decoding not supported>`;
    }
    constructor(
      context: Types.ContractType,
      deployedProgramCounter: number,
      constructorProgramCounter: number
    ) {
      this.kind = "unknown";
      this.context = context;
      this.deployedProgramCounter = deployedProgramCounter;
      this.constructorProgramCounter = constructorProgramCounter;
    }
  }

  //Internal function errors
  export class FunctionInternalErrorResult extends ErrorResult implements FunctionInternalResult {
    type: Types.FunctionType;
    constructor(functionType: Types.FunctionType, error: DecoderError) {
      super(error);
      this.type = functionType;
    }
  }

  export class FunctionInternalPaddingError extends DecoderError {
    raw: string; //should be hex string
    kind: "FunctionInternalPaddingError";
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `Internal function has extra leading bytes (padding error) (raw value ${this.raw})`;
    }
    constructor(raw: string) {
      super();
      this.raw = raw;
      this.kind = "FunctionInternalPaddingError";
    }
  }

  export class NoSuchInternalFunctionError extends DecoderError {
    kind: "NoSuchInternalFunctionError";
    context: Types.ContractType;
    deployedProgramCounter: number;
    constructorProgramCounter: number;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `Invalid function (Deployed PC=${this.deployedProgramCounter}, constructor PC=${this.constructorProgramCounter}) of contract ${this.context.typeName}`;
    }
    constructor(context: Types.ContractType, deployedProgramCounter: number, constructorProgramCounter: number) {
      super();
      this.context = context;
      this.deployedProgramCounter = deployedProgramCounter;
      this.constructorProgramCounter = constructorProgramCounter;
      this.kind = "NoSuchInternalFunctionError";
    }
  }

  export class DeployedFunctionInConstructorError extends DecoderError {
    kind: "DeployedFunctionInConstructorError";
    context: Types.ContractType;
    deployedProgramCounter: number;
    constructorProgramCounter: number;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `Deployed-style function (PC=${this.deployedProgramCounter}) in constructor`;
    }
    constructor(context: Types.ContractType, deployedProgramCounter: number) {
      super();
      this.context = context;
      this.deployedProgramCounter = deployedProgramCounter;
      this.constructorProgramCounter = 0;
      this.kind = "DeployedFunctionInConstructorError";
    }
  }

  export class MalformedInternalFunctionError extends DecoderError {
    kind: "MalformedInternalFunctionError";
    context: Types.ContractType;
    deployedProgramCounter: number;
    constructorProgramCounter: number;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return `Malformed internal function w/constructor PC only (value: ${this.constructorProgramCounter})`;
    }
    constructor(context: Types.ContractType, constructorProgramCounter: number) {
      super();
      this.context = context;
      this.deployedProgramCounter = 0;
      this.constructorProgramCounter = constructorProgramCounter;
      this.kind = "MalformedInternalFunctionError";
    }
  }

  /*
   * SECTION 8: GENERIC ERRORS
   */

  //type-location error
  export class UserDefinedTypeNotFoundError extends GenericError {
    kind: "UserDefinedTypeNotFoundError";
    type: Types.UserDefinedType;
    message() {
      let typeName = Types.isContractDefinedType(this.type)
        ? this.type.definingContractName + "." + this.type.typeName
        : this.type.typeName;
      return `Unknown ${this.type.typeClass} type ${typeName} of id ${this.type.id}`;
    }
    constructor(unknownType: Types.UserDefinedType) {
      super();
      this.type = unknownType;
      this.kind = "UserDefinedTypeNotFoundError";
    }
  }

  //attempted to decode an indexed parameter of reference type error
  export class IndexedReferenceTypeError extends GenericError {
    type: Types.ReferenceType;
    raw: string; //should be hex string
    message() {
      return `Cannot decode indexed parameter of reference type ${this.type.typeClass} (raw value ${this.raw})`;
    }
    constructor(referenceType: Types.ReferenceType, raw: string) {
      super();
      this.type = referenceType;
      this.raw = raw;
    }
  }

  //Read errors
  export class UnsupportedConstantError extends GenericError {
    kind: "UnsupportedConstantError";
    definition: AstDefinition;
    message() {
      return `Unsupported constant type ${DefinitionUtils.typeClass(this.definition)}$`;
    }
    constructor(definition: AstDefinition) {
      super();
      this.definition = definition;
      this.kind = "UnsupportedConstantError";
    }
  }

  export class ReadErrorStack extends GenericError {
    kind: "ReadErrorStack";
    from: number;
    to: number;
    message() {
      return `Can't read stack from position ${this.from} to ${this.to}`;
    }
    constructor(from: number, to: number) {
      super();
      this.from = from;
      this.to = to;
      this.kind = "ReadErrorStack";
    }
  }

  export class ReadErrorTopic extends GenericError {
    topic: number;
    message() {
      return `Can't read event topic ${this.topic}`;
    }
    constructor(topic: number) {
      super();
      this.topic = topic;
    }
  }

  //finally, a convenience function for constructing generic errors
  export function makeGenericErrorResult(dataType: Types.Type, error: GenericError): ErrorResult {
    switch(dataType.typeClass) {
      case "uint":
        return new UintErrorResult(dataType, error);
      case "int":
        return new IntErrorResult(dataType, error);
      case "bool":
        return new BoolErrorResult(dataType, error);
      case "bytes":
        return new BytesErrorResult(dataType, error);
      case "address":
        return new AddressErrorResult(dataType, error);
      case "fixed":
        return new FixedErrorResult(dataType, error);
      case "ufixed":
        return new UfixedErrorResult(dataType, error);
      case "string":
        return new StringErrorResult(dataType, error);
      case "array":
        return new ArrayErrorResult(dataType, error);
      case "mapping":
        return new MappingErrorResult(dataType, error);
      case "struct":
        return new StructErrorResult(dataType, error);
      case "enum":
        return new EnumErrorResult(dataType, error);
      case "contract":
        return new ContractErrorResult(dataType, error);
      case "magic":
        return new MagicErrorResult(dataType, error);
      case "function":
        switch(dataType.visibility) {
          case "external":
        return new FunctionExternalErrorResult(dataType, error);
          case "internal":
        return new FunctionInternalErrorResult(dataType, error);
        }
    }
  }
}

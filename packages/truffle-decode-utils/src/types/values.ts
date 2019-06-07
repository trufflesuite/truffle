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

  //This is the overall Value type.  It may encode an actual value (ValueProper) or
  //an error value (ValueError).  Every value has a type.
  //The reference field is for future use for encoding circular structures; you can
  //ignore it for now.
  //The nativize method is a HACK that you should not use except
  //A. for testing, or
  //B. if you really have to, which we unfortunately do in some cases.
  //See below for more.
  export interface Value {
    type: Types.Type;
    kind: "value" | "error";
    nativize(): any; //HACK
    //turns Value objects into Plain-Old JavaScript Objects
    //May cause errors if numeric values are too big!
    //only use this in testing or if you have no better option!
  };

  //A ValueProper encodes an actual value, not an error.  HOWEVER, if it is a
  //container type (Array, Struct, or Mapping), it is still possible for some
  //of the individual values within it to be errors!
  //The exact type of the value field depends on the type of the Value; don't
  //worry, the more specific types will have more specific type annotations.
  export abstract class ValueProper implements Value {
    type: Types.Type;
    kind: "value";
    value: any; //sorry -- at least it's an abstract class though!
    abstract nativize(): any;
    constructor() {
      this.kind = "value";
    }
  };

  //A ValueError, on the other hand, encodes an error.  Rather than a value field,
  //it has an error field, of type ValueErrorDirect.
  //See section 2 regarding the toSoliditySha3Input method.
  export abstract class ValueError implements Value {
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
  export interface ElementaryValue extends Value {
    type: Types.ElementaryType;
    toSoliditySha3Input(): {type: string; value: any};
  }

  export abstract class ElementaryValueProper extends ValueProper implements ElementaryValue {
    type: Types.ElementaryType;
    abstract toSoliditySha3Input(): {type: string; value: any};
    toString(): string {
      return this.value.toString();
    }
  }

  //Uints
  export interface UintValue extends ElementaryValue {
    type: Types.UintType;
  }

  export class UintValueProper extends ElementaryValueProper implements UintValue {
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
  export class UintValueError extends ValueError implements UintValue {
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
  export interface IntValue extends ElementaryValue {
    type: Types.IntType;
  }

  export class IntValueProper extends ElementaryValueProper implements IntValue {
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
  export class IntValueError extends ValueError implements IntValue {
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
  export interface BoolValue extends ElementaryValue {
    type: Types.BoolType;
  }

  export class BoolValueProper extends ElementaryValueProper implements BoolValue {
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
  export class BoolValueError extends ValueError implements BoolValue {
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
  export interface BytesValue extends ElementaryValue {
    type: Types.BytesType;
  }

  export class BytesValueProper extends ElementaryValueProper implements BytesValue {
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

  export class BytesValueError extends ValueError implements BytesValue {
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
  export interface AddressValue extends ElementaryValue {
    type: Types.AddressType;
  }

  export class AddressValueProper extends ElementaryValueProper implements AddressValue {
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

  export class AddressValueError extends ValueError implements AddressValue {
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
  export interface StringValue extends ElementaryValue {
    type: Types.StringType;
  }

  export class StringValueProper extends ElementaryValueProper {
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

  export class StringValueError extends ValueError implements StringValue {
    type: Types.StringType;
    constructor(stringType: Types.StringType, error: DecoderError) {
      super(error);
      this.type = stringType;
    }
  }
  //no padding error for strings

  //Fixed & Ufixed
  //These don't have a value format yet, so they just decode to errors for now!
  export interface FixedValue extends ElementaryValue {
    type: Types.FixedType;
  }
  export interface UfixedValue extends ElementaryValue {
    type: Types.UfixedType;
  }

  export class FixedValueError extends ValueError implements FixedValue {
    type: Types.FixedType;
    constructor(fixedType: Types.FixedType, error: DecoderError) {
      super(error);
      this.type = fixedType;
    }
  }
  export class UfixedValueError extends ValueError implements UfixedValue {
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

  //Function for wrapping a value as an ElementaryValueProper
  //WARNING: this function does not check its inputs! Please check before using!
  //How to use:
  //numbers may be BN, number, or numeric string
  //strings should be given as strings. duh.
  //bytes should be given as hex strings beginning with "0x"
  //addresses are like bytes; checksum case is not required
  //booleans may be given either as booleans, or as string "true" or "false"
  export function wrapElementaryValue(value: any, definition: AstDefinition): ElementaryValueProper {
    let dataType = Types.definitionToType(definition, null); //force location to undefined
    switch(dataType.typeClass) {
      case "string":
        return new StringValueProper(dataType, value);
      case "bytes":
        return new BytesValueProper(dataType, value);
      case "address":
        return new AddressValueProper(dataType, value);
      case "int":
        if(value instanceof BN) {
          value = value.clone();
        }
        else {
          value = new BN(value);
        }
        return new IntValueProper(dataType, value);
      case "uint":
        if(value instanceof BN) {
          value = value.clone();
        }
        else {
          value = new BN(value);
        }
        return new UintValueProper(dataType, value);
      case "bool":
        if(typeof value === "string") {
          value = value !== "false";
        }
        return new BoolValueProper(dataType, value);
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
  export interface ArrayValue extends Value {
    type: Types.ArrayType;
  }

  export class ArrayValueProper extends ValueProper implements ArrayValue {
    type: Types.ArrayType;
    reference?: number; //will be used in the future for circular values
    value: Value[];
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      if(this.reference !== undefined) {
        return formatCircular(this.reference, options);
      }
      return util.inspect(this.value, options)
    }
    nativize() {
      return this.value.map(element => element.nativize());
    }
    constructor(arrayType: Types.ArrayType, value: Value[], reference?: number) {
      super();
      this.type = arrayType;
      this.value = value;
      this.reference = reference;
    }
  }

  export class ArrayValueError extends ValueError implements ArrayValue {
    type: Types.ArrayType;
    constructor(arrayType: Types.ArrayType, error: DecoderError) {
      super(error);
      this.type = arrayType;
    }
  }

  //Mappings
  export interface MappingValue extends Value {
    type: Types.MappingType;
  }

  export class MappingValueProper extends ValueProper implements MappingValue {
    type: Types.MappingType;
    //note that since mappings live in storage, a circular
    //mapping is impossible
    value: [ElementaryValue, Value][]; //order of key-value pairs is irrelevant
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(new Map(this.value), options);
    }
    nativize() {
      //if only I could use Object.fromEntries() here!
      return Object.assign({}, ...this.value.map(([key, value]) =>
        ({[key.toString()]: value.nativize()})
      ));
    }
    constructor(mappingType: Types.MappingType, value: [ElementaryValue, Value][]) {
      super();
      this.type = mappingType;
      this.value = value;
    }
  }

  export class MappingValueError extends ValueError implements MappingValue {
    type: Types.MappingType;
    constructor(mappingType: Types.MappingType, error: DecoderError) {
      super(error);
      this.type = mappingType;
    }
  }

  //Structs
  export interface StructValue extends Value {
    type: Types.StructType;
  }

  export class StructValueProper extends ValueProper implements StructValue {
    type: Types.StructType;
    reference?: number; //will be used in the future for circular values
    value: {
      [field: string]: Value;
    };
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      if(this.reference !== undefined) {
        return formatCircular(this.reference, options);
      }
      return util.inspect(this.value, options);
    }
    nativize() {
      return Object.assign({}, ...Object.entries(this.value).map(
        ([key, value]) => ({[key]: value.nativize()})
      ));
    }
    constructor(structType: Types.StructType, value: {[field: string]: Value}, reference?: number) {
      super();
      this.type = structType;
      this.value = value;
      this.reference = reference;
    }
  }

  export class StructValueError extends ValueError implements StructValue {
    type: Types.StructType;
    constructor(structType: Types.StructType, error: DecoderError) {
      super(error);
      this.type = structType;
    }
  }

  //Magic variables
  export interface MagicValue extends Value {
    type: Types.MagicType;
  }

  export class MagicValueProper extends ValueProper implements MagicValue {
    type: Types.MagicType;
    //a magic variable can't be circular, duh!
    value: {
      [field: string]: Value
    };
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    nativize() {
      return Object.assign({}, ...Object.entries(this.value).map(
        ([key, value]) => ({[key]: value.nativize()})
      ));
    }
    constructor(magicType: Types.MagicType, value: {[field: string]: Value}) {
      super();
      this.type = magicType;
      this.value = value;
    }
  }

  export class MagicValueError extends ValueError implements MagicValue {
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
  export interface EnumValue extends Value {
    type: Types.EnumType;
  }

  export class EnumValueProper extends ValueProper implements EnumValue {
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
  export class EnumValueError extends ValueError implements EnumValue {
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
  export interface ContractValue extends Value {
    type: Types.ContractType;
  }

  //Contract values have a special new type as their value: ContractValueDirect.
  export class ContractValueProper extends ValueProper implements ContractValue {
    type: Types.ContractType;
    value: ContractValueDirect;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    nativize() {
      return this.value.nativize();
    }
    constructor(contractType: Types.ContractType, value: ContractValueDirect) {
      super();
      this.type = contractType;
      this.value = value;
    }
  }

  //There are two types -- one for contracts whose class we can identify, and one
  //for when we can't identify the class.
  export type ContractValueDirect = ContractValueDirectKnown | ContractValueDirectUnknown;

  //when we can identify the class
  export class ContractValueDirectKnown {
    address: string; //should be formatted as address
    //NOT an AddressValue, note
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
  export class ContractValueDirectUnknown {
    address: string; //should be formatted as address
    //NOT an AddressValue, note
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
  export class ContractValueError extends ValueError implements ContractValue {
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

  //functions can be external or internal, but let's include this union type here
  export type FunctionValue = FunctionValueExternal | FunctionValueInternal;

  //external functions
  export interface FunctionValueExternal extends Value {
    type: Types.FunctionType; //should be external, obviously!
  }

  export class FunctionValueExternalProper extends ValueProper implements FunctionValueExternal {
    type: Types.FunctionType;
    value: FunctionValueExternalDirect;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    nativize() {
      return this.value.nativize();
    }
    constructor(functionType: Types.FunctionType, value: FunctionValueExternalDirect) {
      super();
      this.type = functionType;
      this.value = value;
    }
  }

  //External function values come in 3 types:
  export type FunctionValueExternalDirect =
    FunctionValueExternalDirectKnown //known function of known class
    | FunctionValueExternalDirectInvalid //known class, but can't locate function
    | FunctionValueExternalDirectUnknown; //can't determine class

  //known function of known class
  export class FunctionValueExternalDirectKnown {
    kind: "known";
    contract: ContractValueDirectKnown;
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
    constructor(contract: ContractValueDirectKnown, selector: string, name: string) {
      this.kind = "known";
      this.contract = contract;
      this.selector = selector;
      this.name = name;
    }
  }

  //known class but can't locate function
  export class FunctionValueExternalDirectInvalid {
    kind: "invalid";
    contract: ContractValueDirectKnown;
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
    constructor(contract: ContractValueDirectKnown, selector: string) {
      this.kind = "invalid";
      this.contract = contract;
      this.selector = selector;
    }
  }

  //can't even locate class
  export class FunctionValueExternalDirectUnknown {
    kind: "unknown";
    contract: ContractValueDirectUnknown;
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
    constructor(contract: ContractValueDirectUnknown, selector: string) {
      this.kind = "unknown";
      this.contract = contract;
      this.selector = selector;
    }
  }

  //errors for external functions
  export class FunctionValueExternalError extends ValueError implements FunctionValueExternal {
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
  export interface FunctionValueInternal extends Value {
    type: Types.FunctionType; //should be internal, obviously!
  }

  export class FunctionValueInternalProper extends ValueProper implements FunctionValueInternal {
    type: Types.FunctionType;
    value: FunctionValueInternalDirect;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    nativize() {
      return this.value.nativize();
    }
    constructor(functionType: Types.FunctionType, value: FunctionValueInternalDirect) {
      super();
      this.type = functionType;
      this.value = value;
    }
  }

  //these also come in 3 types
  export type FunctionValueInternalDirect =
    FunctionValueInternalDirectKnown //actual function
    | FunctionValueInternalDirectException //default value
    | FunctionValueInternalDirectUnknown; //decoding not supported in this context

  //actual function
  export class FunctionValueInternalDirectKnown {
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
  export class FunctionValueInternalDirectException {
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
  export class FunctionValueInternalDirectUnknown {
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
  export class FunctionValueInternalError extends ValueError implements FunctionValueInternal {
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

  //finally, a convenience function for constructing generic errors
  export function makeGenericValueError(dataType: Types.Type, error: GenericError): ValueError {
    switch(dataType.typeClass) {
      case "uint":
        return new UintValueError(dataType, error);
      case "int":
        return new IntValueError(dataType, error);
      case "bool":
        return new BoolValueError(dataType, error);
      case "bytes":
        return new BytesValueError(dataType, error);
      case "address":
        return new AddressValueError(dataType, error);
      case "fixed":
        return new FixedValueError(dataType, error);
      case "ufixed":
        return new UfixedValueError(dataType, error);
      case "string":
        return new StringValueError(dataType, error);
      case "array":
        return new ArrayValueError(dataType, error);
      case "mapping":
        return new MappingValueError(dataType, error);
      case "struct":
        return new StructValueError(dataType, error);
      case "enum":
        return new EnumValueError(dataType, error);
      case "contract":
        return new ContractValueError(dataType, error);
      case "magic":
        return new MagicValueError(dataType, error);
      case "function":
        switch(dataType.visibility) {
          case "external":
        return new FunctionValueExternalError(dataType, error);
          case "internal":
        return new FunctionValueInternalError(dataType, error);
        }
    }
  }
}

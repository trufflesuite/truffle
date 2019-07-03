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
  export class DecodingError extends Error {
    error: GenericError;
    constructor(error: GenericError) {
      super(error.message());
      this.error = error;
      this.name = "DecodingError";
    }
  }

  export type ErrorResult = ElementaryErrorResult
    | ArrayErrorResult | MappingErrorResult | StructErrorResult | MagicErrorResult
    | EnumErrorResult
    | ContractErrorResult | FunctionExternalErrorResult | FunctionInternalErrorResult;

  //for internal use only! just here to facilitate code reuse!
  //please use the union types for actual use!
  //this class doesn't even have the error field!
  abstract class ErrorResultBase {
    type: Types.Type;
    kind: "error";
    error: DecoderErrorBase;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.error, options);
    }
    nativize(): any {
      return undefined;
    }
    toSoliditySha3Input(): {type: string; value: any} {
      return undefined; //will cause an error! should not occur!
    }
    constructor() {
      this.kind = "error";
    }
  }

  //also just for internal use to make things easier!
  abstract class DecoderErrorBase {
    kind: string;
  }

  /*
   * SECTION 2: Elementary values
   */

  export type ElementaryErrorResult = UintErrorResult | IntErrorResult | BoolErrorResult
    | BytesErrorResult | AddressErrorResult | StringErrorResult
    | FixedErrorResult | UfixedErrorResult;
  export type BytesErrorResult = BytesStaticErrorResult | BytesDynamicErrorResult;

  //Uints
  export class UintErrorResult extends ErrorResultBase {
    constructor(
      public uintType: Types.UintType,
      public error: GenericError | UintPaddingError
    ) {
      super();
    }
  }

  export class UintPaddingError extends DecoderErrorBase {
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
  export class IntErrorResult extends ErrorResultBase {
    constructor(
      public intType: Types.IntType,
      public error: GenericError | IntPaddingError
    ) {
      super();
    }
  }

  export class IntPaddingError extends DecoderErrorBase {
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
  export class BoolErrorResult extends ErrorResultBase {
    constructor(
      public boolType: Types.BoolType,
      public error: GenericError | BoolPaddingError | BoolOutOfRangeError
    ) {
      super();
    }
  }

  export class BoolPaddingError extends DecoderErrorBase {
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

  export class BoolOutOfRangeError extends DecoderErrorBase {
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

  //bytes (static)
  export class BytesStaticErrorResult extends ErrorResultBase {
    constructor(
      public bytesType: Types.BytesTypeStatic,
      public error: GenericError | BytesPaddingError
    ) {
      super();
    }
  }

  export class BytesPaddingError extends DecoderErrorBase {
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

  //bytes (dynamic)
  export class BytesDynamicErrorResult extends ErrorResultBase {
    constructor(
      public bytesType: Types.BytesTypeDynamic,
      public error: GenericError
    ) {
      super();
    }
  }

  //addresses
  export class AddressErrorResult extends ErrorResultBase {
    constructor(
      public addressType: Types.AddressType,
      public error: GenericError | AddressPaddingError
    ) {
      super();
    }
  }

  export class AddressPaddingError extends DecoderErrorBase {
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
  export class StringErrorResult extends ErrorResultBase {
    constructor(
      public stringType: Types.StringType,
      public error: GenericError
    ) {
      super();
    }
  }

  //Fixed & Ufixed
  //These don't have a value format yet, so they just decode to errors for now!
  export class FixedErrorResult extends ErrorResultBase {
    constructor(
      public fixedType: Types.FixedType,
      public error: GenericError | FixedPointNotYetSupportedError
    ) {
      super();
    }
  }
  export class UfixedErrorResult extends ErrorResultBase {
    constructor(
      public ufixedType: Types.UfixedType,
      public error: GenericError | FixedPointNotYetSupportedError
    ) {
      super();
    }
  }

  export class FixedPointNotYetSupportedError extends DecoderErrorBase {
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

  /*
   * SECTION 3: CONTAINER TYPES (including magic)
   */

  //Arrays
  export class ArrayErrorResult extends ErrorResultBase {
    constructor(
      public arrayType: Types.ArrayType,
      public error: GenericError
    ) {
      super();
    }
  }

  //Mappings
  export class MappingErrorResult extends ErrorResultBase {
    constructor(
      public mappingType: Types.MappingType,
      public error: GenericError
    ) {
      super();
    }
  }

  //Structs
  export class StructErrorResult extends ErrorResultBase {
    constructor(
      public structType: Types.StructType,
      public error: GenericError
    ) {
      super();
    }
  }

  //Magic variables
  export class MagicErrorResult extends ErrorResultBase {
    constructor(
      public magicType: Types.MagicType,
      public error: GenericError
    ) {
      super();
    }
  }

  /*
   * SECTION 4: ENUMS
   * (they didn't fit anywhere else :P )
   */

  //Enums
  export class EnumErrorResult extends ErrorResultBase {
    constructor(
      public enumType: Types.EnumType,
      public error: GenericError | EnumPaddingError | EnumOutOfRangeError | EnumNotFoundDecodingError
    ) {
      super();
    }
  }

  export class EnumPaddingError extends DecoderErrorBase {
    kind: "EnumPaddingError";
    type: Types.EnumType;
    raw: string; //should be hex string
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      let typeName = (this.type.kind === "local" ? (this.type.definingContractName + ".") : "") + this.type.typeName;
      return `${typeName} has extra leading bytes (padding error) (raw value ${this.raw})`;
    }
    constructor(enumType: Types.EnumType, raw: string) {
      super();
      this.type = enumType;
      this.raw = raw;
      this.kind = "EnumPaddingError";
    }
  }

  export class EnumOutOfRangeError extends DecoderErrorBase {
    kind: "EnumOutOfRangeError";
    type: Types.EnumType;
    raw: BN;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      let typeName = (this.type.kind === "local" ? (this.type.definingContractName + ".") : "") + this.type.typeName;
      return `Invalid ${typeName} (numeric value ${this.raw.toString()})`;
    }
    constructor(enumType: Types.EnumType, raw: BN) {
      super();
      this.type = enumType;
      this.raw = raw;
      this.kind = "EnumOutOfRangeError";
    }
  }

  export class EnumNotFoundDecodingError extends DecoderErrorBase {
    kind: "EnumNotFoundDecodingError";
    type: Types.EnumType;
    raw: BN;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      let typeName = (this.type.kind === "local" ? (this.type.definingContractName + ".") : "") + this.type.typeName;
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
  export class ContractErrorResult extends ErrorResultBase {
    constructor(
      public contractType: Types.ContractType,
      public error: GenericError | ContractPaddingError
    ) {
      super();
    }
  }

  export class ContractPaddingError extends DecoderErrorBase {
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
  export class FunctionExternalErrorResult extends ErrorResultBase {
    constructor(
      public functionType: Types.FunctionTypeExternal,
      public error: GenericError | FunctionExternalNonStackPaddingError | FunctionExternalStackPaddingError
    ) {
      super();
    }
  }

  export class FunctionExternalNonStackPaddingError extends DecoderErrorBase {
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

  export class FunctionExternalStackPaddingError extends DecoderErrorBase {
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
  export class FunctionInternalErrorResult extends ErrorResultBase {
    constructor(
      public functionType: Types.FunctionTypeInternal,
      public error: GenericError | FunctionInternalPaddingError
        | NoSuchInternalFunctionError | DeployedFunctionInConstructorError | MalformedInternalFunctionError
    ) {
      super();
    }
  }

  export class FunctionInternalPaddingError extends DecoderErrorBase {
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

  export class NoSuchInternalFunctionError extends DecoderErrorBase {
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

  export class DeployedFunctionInConstructorError extends DecoderErrorBase {
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

  export class MalformedInternalFunctionError extends DecoderErrorBase {
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

  export type GenericError = UserDefinedTypeNotFoundError | IndexedReferenceTypeError
    | UnsupportedConstantError | ReadErrorStack | ReadErrorTopic;

  //type-location error
  export class UserDefinedTypeNotFoundError extends DecoderErrorBase {
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
  export class IndexedReferenceTypeError extends DecoderErrorBase {
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
  export class UnsupportedConstantError extends DecoderErrorBase {
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

  export class ReadErrorStack extends DecoderErrorBase {
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

  export class ReadErrorTopic extends DecoderErrorBase {
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
        switch(dataType.kind) {
          case "static":
            return new BytesStaticErrorResult(dataType, error);
          case "dynamic":
            return new BytesDynamicErrorResult(dataType, error);
        }
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

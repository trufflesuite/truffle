import debugModule from "debug";
const debug = debugModule("decode-utils:types:values");

//objects for Solidity values

//Note: This is NOT intended to represent every possible value that exists
//in Solidity!  Only possible values of variables.  (Though there may be
//some expansion in the future; I'm definitely intending to add tuples.)
//We do however count the builtin variables msg, block, and tx as variables
//(not other builtins though for now) so there is some support for the magic
//type.

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
import { Errors } from "./errors";
import { InspectOptions, cleanStylize } from "./inspect";
import util from "util";
import { AstDefinition } from "../ast";
import { Definition as DefinitionUtils } from "../definition";

export namespace Values {

  /*
   * SECTION 1: Generic types for values in general (including errors).
   */

  //This is the overall Result type.  It may encode an actual value or an error.
  export type Result = ElementaryResult
    | ArrayResult | MappingResult | StructResult | MagicResult
    | EnumResult
    | ContractResult | FunctionExternalResult | FunctionInternalResult;
  //for when you want an actual value
  export type Value = ElementaryValue
    | ArrayValue | MappingValue | StructValue | MagicValue
    | EnumValue
    | ContractValue | FunctionExternalValue | FunctionInternalValue;

  /*
   * SECTION 2: Elementary values
   */

  export type ElementaryResult = UintResult | IntResult | BoolResult
    | BytesResult | AddressResult | StringResult
    | FixedResult | UfixedResult;
  export type BytesResult = BytesStaticResult | BytesDynamicResult;

  //note that we often want an elementary *value*, and not an error!
  //so let's define those types too
  export type ElementaryValue = UintValue | IntValue | BoolValue
    | BytesValue | AddressValue | StringValue;
  //we don't include FixedValue or UfixedValue because those
  //aren't implemented yet
  export type BytesValue = BytesStaticValue | BytesDynamicValue;


  //Uints
  export type UintResult = UintValue | Errors.UintErrorResult;

  export class UintValue {
    type: Types.UintType;
    kind: "value";
    value: {
      asBN: BN;
      rawAsBN?: BN;
    };
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return options.stylize(this.toString(), "number");
    }
    toSoliditySha3Input() {
      return {
        type: "uint",
        value: this.value.asBN
      }
    }
    nativize(): any {
      return this.value.asBN.toNumber(); //beware!
    }
    toString(): string {
      return this.value.asBN.toString();
    }
    constructor(uintType: Types.UintType, value: BN, rawValue?: BN) {
      this.type = uintType;
      this.kind = "value";
      this.value = { asBN: value, rawAsBN: rawValue };
    }
  }

  //Ints
  export type IntResult = IntValue | Errors.IntErrorResult;

  export class IntValue {
    type: Types.IntType;
    kind: "value";
    value: {
      asBN: BN;
      rawAsBN?: BN;
    };
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return options.stylize(this.toString(), "number");
    }
    toSoliditySha3Input() {
      return {
        type: "int",
        value: this.value.asBN
      }
    }
    nativize(): any {
      return this.value.asBN.toNumber(); //beware!
    }
    toString(): string {
      return this.value.asBN.toString();
    }
    constructor(intType: Types.IntType, value: BN, rawValue?: BN) {
      this.type = intType;
      this.kind = "value";
      this.value = { asBN: value, rawAsBN: rawValue };
    }
  }

  //Bools
  export type BoolResult = BoolValue | Errors.BoolErrorResult;

  export class BoolValue {
    type: Types.BoolType;
    kind: "value";
    value: {
      asBool: boolean;
    };
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value.asBool, options);
    }
    toSoliditySha3Input() {
      return {
        type: "uint", //used to achieve left-padding
        value: this.value.asBool ? new BN(1) : new BN(0) //true & false won't work here
      }
    }
    nativize(): any {
      return this.value.asBool;
    }
    toString(): string {
      return this.value.asBool.toString();
    }
    constructor(boolType: Types.BoolType, value: boolean) {
      this.type = boolType;
      this.kind = "value";
      this.value = { asBool: value };
    }
  }

  //bytes (static)
  export type BytesStaticResult = BytesStaticValue | Errors.BytesStaticErrorResult;

  export class BytesStaticValue {
    type: Types.BytesTypeStatic;
    kind: "value";
    value: {
      asHex: string; //should be hex-formatted, with leading "0x"
      rawAsHex: string;
    };
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return options.stylize(this.value.asHex, "number");
    }
    toSoliditySha3Input() {
      return {
        type: "bytes32", //used to achieve right-padding
        value: this.value.asHex
      };
    }
    nativize(): any {
      return this.value.asHex;
    }
    toString(): string {
      return this.value.asHex;
    }
    constructor(bytesType: Types.BytesTypeStatic, value: string, rawValue?: string) {
      this.type = bytesType;
      this.kind = "value";
      this.value = { asHex: value, rawAsHex: rawValue };
    }
  }

  //bytes (dynamic)
  export type BytesDynamicResult = BytesDynamicValue | Errors.BytesDynamicErrorResult;

  export class BytesDynamicValue {
    type: Types.BytesTypeDynamic;
    kind: "value";
    value: {
      asHex: string; //should be hex-formatted, with leading "0x"
    };
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return options.stylize(`hex'${this.value.asHex.slice(2)}'`, "string")
    }
    toSoliditySha3Input() {
      return {
        type: "bytes",
        value: this.value.asHex
      };
    }
    nativize(): any {
      return this.value.asHex;
    }
    toString(): string {
      return this.value.asHex;
    }
    constructor(bytesType: Types.BytesTypeDynamic, value: string) {
      this.type = bytesType;
      this.kind = "value";
      this.value = { asHex: value };
    }
  }

  //addresses
  export type AddressResult = AddressValue | Errors.AddressErrorResult;

  export class AddressValue {
    type: Types.AddressType;
    kind: "value";
    value: {
      asAddress: string; //should have 0x and be checksum-cased
      rawAsHex: string;
    }
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return options.stylize(this.value.asAddress, "number");
    }
    toSoliditySha3Input() {
      return {
        type: "uint", //used to achieve left-padding
        value: this.value.asAddress
      }
    }
    nativize(): any {
      return this.value.asAddress;
    }
    toString(): string {
      return this.value.asAddress;
    }
    constructor(addressType: Types.AddressType, value: string, rawValue?: string) {
      this.type = addressType;
      this.kind = "value";
      this.value = { asAddress: value, rawAsHex: rawValue };
    }
  }

  //strings
  export type StringResult = StringValue | Errors.StringErrorResult;

  //strings have a special new type as their value: StringValueInfo
  export class StringValue {
    type: Types.StringType;
    kind: "value";
    value: StringValueInfo;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    toSoliditySha3Input() {
      return this.value.toSoliditySha3Input();
    }
    nativize(): any {
      return this.value.nativize();
    }
    toString(): string {
      return this.value.toString();
    }
    constructor(stringType: Types.StringType, value: StringValueInfo) {
      this.type = stringType;
      this.kind = "value";
      this.value = value;
    }
  }

  //these come in two types: valid strings and malformed strings
  export type StringValueInfo = StringValueInfoValid | StringValueInfoMalformed;

  //valid strings
  export class StringValueInfoValid {
    kind: "valid";
    asString: string;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.asString, options);
    }
    toSoliditySha3Input() {
      return {
        type: "string",
        value: this.asString
      };
    }
    nativize(): any {
      return this.asString;
    }
    toString(): string {
      return this.asString;
    }
    constructor(value: string) {
      this.kind = "valid";
      this.asString = value;
    }
  }

  //malformed strings
  export class StringValueInfoMalformed {
    kind: "malformed";
    asHex: string;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return options.stylize(`hex'${this.asHex.slice(2)}'`, "string") + " (malformed)";
    }
    toSoliditySha3Input() {
      return {
        type: "bytes",
        value: this.asHex
      };
    }
    nativize(): any {
      return this.asHex; //warning!
    }
    toString(): string {
      return this.asHex; //warning!
    }
    constructor(value: string) {
      this.kind = "malformed";
      this.asHex = value;
    }
  }

  //Fixed & Ufixed
  //These don't have a value format yet, so they just decode to errors for now!
  
  export type FixedResult = Errors.FixedErrorResult;
  export type UfixedResult = Errors.UfixedErrorResult;

  //Function for wrapping a value as an ElementaryValue
  //WARNING: this function does not check its inputs! Please check before using!
  //How to use:
  //numbers may be BN, number, or numeric string
  //strings should be given as strings. duh.
  //bytes should be given as hex strings beginning with "0x"
  //addresses are like bytes; checksum case is not required
  //booleans may be given either as booleans, or as string "true" or "false"
  //[NOTE: in the future this function will:
  //1. be moved to truffle-codec/lib/encode,
  //2. check its inputs,
  //3. take a slightly different input format]
  export function wrapElementaryValue(value: any, definition: AstDefinition): ElementaryValue {
    //force location to undefined, force address to nonpayable
    //(we force address to nonpayable since address payable can't be declared
    //as a mapping key type)
    let dataType = Types.definitionToType(definition, null, null);
    switch(dataType.typeClass) {
      case "string":
        return new StringValue(dataType, new StringValueInfoValid(value));
      case "bytes":
        switch(dataType.kind) {
          case "static":
            return new BytesStaticValue(dataType, value);
          case "dynamic":
            return new BytesDynamicValue(dataType, value);
        }
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
  export type ArrayResult = ArrayValue | Errors.ArrayErrorResult;

  export class ArrayValue {
    type: Types.ArrayType;
    kind: "value";
    reference?: number; //will be used in the future for circular values
    value: Result[];
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      if(this.reference !== undefined) {
        return formatCircular(this.reference, options);
      }
      return util.inspect(this.value, options)
    }
    nativize(): any {
      return this.value.map(element => element.nativize());
    }
    constructor(arrayType: Types.ArrayType, value: Result[], reference?: number) {
      this.type = arrayType;
      this.kind = "value";
      this.value = value;
      this.reference = reference;
    }
  }

  //Mappings
  export type MappingResult = MappingValue | Errors.MappingErrorResult;

  export class MappingValue {
    type: Types.MappingType;
    kind: "value";
    //note that since mappings live in storage, a circular
    //mapping is impossible
    value: {key: ElementaryValue, value: Result}[]; //order of key-value pairs is irrelevant
    //note that key is not allowed to be an error!
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(new Map(this.value.map(
        ({key, value}) => [key, value]
      )), options);
    }
    nativize(): any {
      return Object.assign({}, ...this.value.map(({key, value}) =>
        ({[key.toString()]: value.nativize()})
      ));
    }
    constructor(mappingType: Types.MappingType, value: {key: ElementaryValue, value: Result}[]) {
      this.type = mappingType;
      this.kind = "value";
      this.value = value;
    }
  }

  //Structs
  export type StructResult = StructValue | Errors.StructErrorResult;

  export class StructValue {
    type: Types.StructType;
    kind: "value";
    reference?: number; //will be used in the future for circular values
    value: {name: string, value: Result}[]; //these should be stored in order!
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      if(this.reference !== undefined) {
        return formatCircular(this.reference, options);
      }
      return util.inspect(
        Object.assign({}, ...this.value.map(
          ({name, value}) => ({[name]: value})
        )),
        options
      );
    }
    nativize(): any {
      return Object.assign({}, ...this.value.map(
        ({name, value}) => ({[name]: value.nativize()})
      ));
    }
    constructor(structType: Types.StructType, value: {name: string, value: Result}[], reference?: number) {
      this.type = structType;
      this.kind = "value";
      this.value = value;
      this.reference = reference;
    }
  }

  //Magic variables
  export type MagicResult = MagicValue | Errors.MagicErrorResult;

  export class MagicValue {
    type: Types.MagicType;
    kind: "value";
    //a magic variable can't be circular, duh!
    value: {
      [field: string]: Result
    };
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    nativize(): any {
      return Object.assign({}, ...Object.entries(this.value).map(
        ([key, value]) => ({[key]: value.nativize()})
      ));
    }
    constructor(magicType: Types.MagicType, value: {[field: string]: Result}) {
      this.type = magicType;
      this.kind = "value";
      this.value = value;
    }
  }

  /*
   * SECTION 4: ENUMS
   * (they didn't fit anywhere else :P )
   */

  //Enums
  export type EnumResult = EnumValue | Errors.EnumErrorResult;

  export class EnumValue {
    type: Types.EnumType;
    kind: "value";
    value: {
      name: string;
      numericAsBN: BN;
    };
    fullName(): string {
      switch(this.type.kind) {
        case "local":
          return `${this.type.definingContractName}.${this.type.typeName}.${this.value.name}`;
        case "global":
          return `${this.type.typeName}.${this.value.name}`;
      }
    }
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return this.fullName();
    }
    nativize(): any {
      return this.fullName();
    }
    constructor(enumType: Types.EnumType, numeric: BN, name: string) {
      this.type = enumType;
      this.kind = "value";
      this.value = { name, numericAsBN: numeric };
    }
  };

  /*
   * SECTION 5: CONTRACTS
   */

  //Contracts
  export type ContractResult = ContractValue | Errors.ContractErrorResult;

  //Contract values have a special new type as their value: ContractValueInfo.
  export class ContractValue {
    type: Types.ContractType;
    kind: "value";
    value: ContractValueInfo;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    nativize(): any {
      return this.value.nativize();
    }
    constructor(contractType: Types.ContractType, value: ContractValueInfo) {
      this.type = contractType;
      this.kind = "value";
      this.value = value;
    }
  }

  //There are two types -- one for contracts whose class we can identify, and one
  //for when we can't identify the class.
  export type ContractValueInfo = ContractValueInfoKnown | ContractValueInfoUnknown;

  //when we can identify the class
  export class ContractValueInfoKnown {
    kind: "known";
    address: string; //should be formatted as address
    //NOT an AddressResult, note
    rawAddress?: string;
    class: Types.ContractType;
    //may have more optional members defined later, but I'll leave these out for now
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return options.stylize(this.address, "number") + ` (${this.class.typeName})`;
    }
    nativize(): any {
      return `${this.class.typeName}(${this.address})`;
    }
    constructor(address: string, contractClass: Types.ContractType, rawAddress?: string) {
      this.kind = "known";
      this.address = address;
      this.class = contractClass;
      this.rawAddress = rawAddress;
    }
  }

  //when we can't
  export class ContractValueInfoUnknown {
    kind: "unknown";
    address: string; //should be formatted as address
    //NOT an AddressResult, note
    rawAddress?: string;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      debug("options: %O", options);
      return options.stylize(this.address, "number") + " of unknown class";
    }
    nativize(): any {
      return this.address;
    }
    constructor(address: string, rawAddress?: string) {
      this.kind = "unknown";
      this.address = address;
      this.rawAddress = rawAddress;
    }
  }

  /*
   * SECTION 6: External functions
   */

  //external functions
  export type FunctionExternalResult = FunctionExternalValue | Errors.FunctionExternalErrorResult;

  export class FunctionExternalValue {
    type: Types.FunctionTypeExternal;
    kind: "value";
    value: FunctionExternalValueInfo;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    nativize(): any {
      return this.value.nativize();
    }
    constructor(functionType: Types.FunctionTypeExternal, value: FunctionExternalValueInfo) {
      this.type = functionType;
      this.kind = "value";
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
    nativize(): any {
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
    nativize(): any {
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
    nativize(): any {
      return `${this.contract.nativize()}.call(${this.selector}...)`
    }
    constructor(contract: ContractValueInfoUnknown, selector: string) {
      this.kind = "unknown";
      this.contract = contract;
      this.selector = selector;
    }
  }

  /*
   * SECTION 7: INTERNAL FUNCTIONS
   */

  //Internal functions
  export type FunctionInternalResult = FunctionInternalValue | Errors.FunctionInternalErrorResult;

  export class FunctionInternalValue {
    type: Types.FunctionTypeInternal;
    kind: "value";
    value: FunctionInternalValueInfo;
    [util.inspect.custom](depth: number | null, options: InspectOptions): string {
      return util.inspect(this.value, options);
    }
    nativize(): any {
      return this.value.nativize();
    }
    constructor(functionType: Types.FunctionTypeInternal, value: FunctionInternalValueInfo) {
      this.type = functionType;
      this.kind = "value";
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
    nativize(): any {
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
    nativize(): any {
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
    nativize(): any {
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

}

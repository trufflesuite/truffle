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
//just intended for the future.

//Note: the errors defined here deliberately *don't* extend Error.  This is
//because their intended use is a little different (even if we might throw
//one).

import BN from "bn.js";
import * as Types from "./types";
import util from "util";
import { AstDefinition } from "./ast.ts";
import DefinitionUtils from "./definition.ts";

//we'll need to write a typing for the options type ourself, it seems; just
//going to include the relevant properties here
interface InspectOptions {
  stylize(toMaybeColor: string, style?: string): string;
  colors: boolean;
}

function formatCircular(loopLength: number, options: InspectOptions) {
  return options.stylize(`[Circular (=up ${this.loopLength})]`, "special");
}

abstract class Value {
  type: Types.Type;
  reference?: number; //will be used in the future for circular values
};

abstract class ValueProper extends Value {
  value: any; //sorry -- at least it's an abstract class though!
};
//note: a ValueProper might still have errors within it!

abstract class ElementaryValueProper extends ValueProper {
  toSoliditySha3Input(): {type: string; value: any};
  toString(): string {
    return this.value.toString();
  }
}

abstract class ValueError extends Value {
  error: DecoderError;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return util.inspect(this.error, options);
  }
};

type DecoderError = DecodeError | GenericErrorDirect;

class GenericError extends ValueError {
  error: GenericErrorDirect;
  constructor(error: GenericErrorDirect) {
    this.error = error;
  }
}

abstract class GenericErrorDirect {
  message(): string;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return this.message();
  }
}

//this one is for throwing; apologies about the confusing name, but I
//wanted something that would make sense should it not be caught
class DecodingError extends Error {
  error: GenericErrorDirect;
  constructor(error: GenericErrorDirect) {
    super(error.message());
    this.error = error;
    this.name = "DecodingError";
  }
}

type DecodeError = BoolDecodingError | EnumDecodingError | FunctionInternalDecodingError | StructDecodingError;

type UintValue = UintValueProper | GenericError;

class UintValueProper extends ElementaryValueProper {
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
  constructor(uintType: Types.UintType, value: BN) {
    this.type = uintType;
    this.value = value;
  }
}

type IntValue = IntValueProper | GenericError;

class IntValueProper extends ValueProper {
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
  constructor(intType: Types.IntType, value: BN) {
    this.type = intType;
    this.value = value;
  }
}

type BoolValue = BoolValueProper | BoolValueError | GenericError;

class BoolValueProper extends ValueProper {
  type: Types.BoolType;
  value: boolean;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return util.inspect(this.value, options);
  }
  toSoliditySha3Input() {
    return {
      type: "uint",
      value: this.value ? new BN(1) : new BN(0)
    }
  }
  constructor(boolType: Types.BoolType, value: boolean) {
    this.type = boolType;
    this.value = value;
  }
}

class BoolValueError extends ValueError {
  type: Types.BoolType;
  error: BoolDecodingError;
  constructor(boolType: Types.BoolType, error: BoolDecodingError) {
    this.type = boolType;
    this.error = error;
  }
}

abstract class BoolDecodingError {
  raw: BN;
}

class BoolOutOfRangeError extends BoolDecodingError {
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return `Invalid boolean (numeric value ${this.raw.toString()})`;
  }
  constructor(raw: BN) {
    this.raw = raw;
  }
}

type BytesValue = BytesValueProper | GenericError;

class BytesValueProper extends ValueProper {
  type: Types.BytesType;
  value: string; //should be hex-formatted, with leading "0x"
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return this.type.dynamic
      ? return options.stylize(`hex'${this.value.slice(2)}'`, "string")
      : return options.stylize(this.value, "number");
  }
  toSoliditySha3Input(): {
    return {
      type: this.type.dynamic ? "bytes" : "bytes32",
      value: this.value
    }
  }
  constructor(bytesType: Types.BytesType, value: string) {
    this.type = bytesType;
    this.value = value;
  }
}

type AddressValue = AddressValueProper | GenericError;

class AddressValueProper extends ValueProper {
  type: Types.AddressType;
  value: string; //should have 0x and be checksum-cased
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return options.stylize(this.value, "number");
  }
  toSoliditySha3Input() {
    return {
      type: "uint",
      value: this.value
    }
  }
  constructor(addressType: Types.AddressType, value: string) {
    this.type = addressType;
    this.value = value;
  }
}

type StringValue = StringValueProper | GenericError;

class StringValueProper extends ValueProper {
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
  constructor(stringType: Types.StringType, value: string) {
    this.type = stringType;
    this.value = value;
  }
}

//I'm skipping FixedValue and UfixedValue for now

type ArrayValue = ArrayValueProper | GenericError;

class ArrayValueProper extends ValueProper {
  type: Types.ArrayType;
  value: Value[];
  [util.inspect.custom](depth: number | null, options: InspectOptions): string | undefined {
    if(this.reference !== undefined) {
      return formatLoopLength(this.reference, options);
    }
    return util.inspect(value, options)
  }
  constructor(arrayType: Types.ArrayType, value: Value[]) {
    this.type = arrayType;
    this.value = value;
  }
}

type ElementaryValue = UintValue | IntValue | BoolValue | BytesValue | AddressValue | StringValue;
//again, FixedValue and UfixedValue are excluded for now

type MappingValue = MappingValueProper | GenericError;

class MappingValueProper extends ValueProper {
  type: Types.MappingType;
  value: [ElementaryValue, Value][]; //order of key-value pairs is irrelevant
  [util.inspect.custom](depth: number | null, options: InspectOptions): string | undefined {
    return util.inspect(new Map(value), options);
  }
  constructor(mappingType: Types.MappingType, value: [ElementaryValue, Value][]) {
    this.type = mappingType;
    this.value = value;
  }
}

type FunctionValue = FunctionValueExternal | FunctionValueInternal;
type FunctionValueInternal = FunctionValueInternalProper | FunctionValueInternalError | GenericError;
type FunctionValueExternal = FunctionValueExternalProper | GenericError;
type FunctionValueExternalProper =
  FunctionValueExternalProperKnown
  | FunctionValueExternalProperInvalid
  | FunctionValueExternalProperUnknown;
type FunctionValueInternalProper = 
  | FunctionValueInternalKnown
  | FunctionValueInternalException
  | FunctionValueInternalUnknown

class FunctionValueExternalProperKnown extends ValueProper {
  type: Types.FunctionType; //should be external, obviously
  value: {
    contract: ContractValueDirectKnown;
    kind: "known";
    selector: string; //formatted as a bytes4
    name: string;
  };
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    //first, let's inspect that contract, but w/o color
    let contractString = util.inspect(this.value.contract, { ...options, colors: false });
    //now, put it together
    return options.stylize(`[Function: ${this.name} of ${contractString}]`, "special");
  }
  constructor(functionType: Types.FunctionType, contract: ContractValueDirectKnown, selector: string, name: string) {
    this.type = functionType;
    this.value = { contract, selector, name, kind: "known" };
  }
}

class FunctionValueExternalProperInvalid extends ValueProper {
  type: Types.FunctionType; //should be external, obviously
  value: {
    contract: ContractValueDirectKnown;
    kind: "invalid";
    selector: string; //formatted as a bytes4
  };
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    //first, let's inspect that contract, but w/o color
    let contractString = util.inspect(this.value.contract, { ...options, colors: false });
    let selectorString = `Unknown function 0x${this.selector.value}`;
    //now, put it together
    return options.stylize(`[Function: ${selectorString} of ${contractString}]`, "special");
  }
  constructor(functionType: Types.FunctionType, contract: ContractValueDirectKnown, selector: string) {
    this.type = functionType;
    this.value = { contract, selector, kind: "invalid" };
  }
}

class FunctionValueExternalProperUnknown extends ValueProper {
  type: Types.FunctionType; //should be external, obviously
  value: {
    contract: ContractValueDirectUnknown;
    kind: "unknown";
    selector: string; //formatted as a bytes4
  };
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    //first, let's inspect that contract, but w/o color
    let contractString = util.inspect(this.value.contract, { ...options, colors: false });
    let selectorString = `Unknown function 0x${this.selector.value}`;
    //now, put it together
    return options.stylize(`[Function: ${selectorString} of ${contractString}]`, "special");
  }
  constructor(functionType: Types.FunctionType, contract: ContractValueDirectUnknown, selector: string) {
    this.type = functionType;
    this.value = { contract, selector, kind: "unknown" };
  }
}

class FunctionValueInternalProperKnown extends ValueProper {
  type: Types.FunctionType; //should be internal, obviously
  value: {
    kind: "function"
    context: Types.ContractType;
    deployedProgramCounter: number;
    constructorProgramCounter: number;
    name: string;
    definedIn: Types.ContractType;
  };
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return options.stylize(`[Function: ${this.definedIn.typeName}.${this.name}]`, "special");
  }
  constructor(
    functionType: Types.FunctionType,
    context: Types.ContractType,
    deployedProgramCounter: number,
    constructorProgramCounter: number,
    name: string,
    definedIn: Types.ContractType
  ) {
    this.type = functionType;
    this.value = {
      context,
      deployedProgramCounter,
      constructorProgramCounter,
      name,
      definedIn,
      kind: "exception"
    };
  }
}

class FunctionValueInternalProperException extends ValueProper {
  type: Types.FunctionType; //should be internal, obviously
  value: {
    kind: "exception"
    context: Types.ContractType;
    deployedProgramCounter: number;
    constructorProgramCounter: number;
  };
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return this.deployedProgramCounter === 0
      ? options.stylize(`[Function: <zero>]`, "special")
      : options.stylize(`[Function: assert(false)]`, "special");
  }
  constructor(
    functionType: Types.FunctionType,
    context: Types.ContractType,
    deployedProgramCounter: number,
    constructorProgramCounter: number
  ) {
    this.type = functionType;
    this.value = { context, deployedProgramCounter, constructorProgramCounter, kind: "exception" };
  }
}

class FunctionValueInternalProperUnknown extends ValueProper {
  type: Types.FunctionType; //should be internal, obviously
  value: {
    kind: "unknown"
    context: Types.ContractType;
    deployedProgramCounter: number;
    constructorProgramCounter: number;
  };
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return options.stylize(`[Function: decoding not supported (raw info: deployed PC=${this.deployedProgramCounter}, constructor PC=${this.constructorProgramCounter})]`, "special");
  }
  constructor(
    functionType: Types.FunctionType,
    context: Types.ContractType,
    deployedProgramCounter: number,
    constructorProgramCounter: number
  ) {
    this.type = functionType;
    this.value = { context, deployedProgramCounter, constructorProgramCounter, kind: "unknown" };
  }
}

class FunctionValueInternalError extends ValueError {
  type: Types.FunctionType; //should be internal, obviously
  error: FunctionInternalDecodingError;
  constructor(functionType: Types.FunctionType, error: FunctionInternalDecodingError) {
    this.type = functionType;
    this.error = error;
  }
}

abstract class FunctionInternalDecodingError {
  context: Types.ContractType;
  deployedProgramCounter: number;
  constructorProgramCounter: number;
}

class NoSuchInternalFunctionError extends FunctionInternalDecodingError {
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return `Invalid function (Deployed PC=${this.deployedProgramCounter}, constructor PC=${this.constructorProgramCounter}) of contract ${this.context.typeName}`;
  }
  constructor(context: Types.ContractType, deployedProgramCounter: number, constructorProgramCounter: number) {
    this.context = context;
    this.deployedProgramCounter = deployedProgramCounter;
    this.constructorProgramCounter = constructorProgramCounter;
  }
}

class DeployedFunctionInConstructorError extends FunctionInternalDecodingError {
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return `Deployed-style function (PC=${this.deployedProgramCounter}) in constructor`;
  }
  constructor(context: Types.ContractType, deployedProgramCounter: number) {
    this.context = context;
    this.deployedProgramCounter = deployedProgramCounter;
    this.constructorProgramCounter = 0;
  }
}

class MalformedInternalFunctionError extends FunctionInternalDecodingError {
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return `Malformed internal function w/constructor PC only (value: ${this.constructorProgramCounter})`;
  }
  constructor(deployedProgramCounter: number, constructorProgramCounter: number) {
    this.context = context;
    this.deployedProgramCounter = 0;
    this.constructorProgramCounter = constructorProgramCounter;
  }
}

type StructValue = StructValueProper | GenericError;

class StructValueProper extends ValueProper {
  type: Types.StructType;
  value: {
    [field: string]: Value;
  };
  [util.inspect.custom](depth: number | null, options: InspectOptions): string | undefined {
    if(this.reference !== undefined) {
      return formatLoopLength(this.reference, options);
    }
    return util.inspect(value, options);
  }
  constructor(structType: Types.StructType, value: {[field: string]: Value}) {
    this.type = structType;
    this.value = value;
  }
}

class StructNotFoundError extends StructDecodingError {
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    let typeName = this.type.definingContract.typeName + "." + this.type.typeName;
    return `Unknown struct type ${typeName} of id ${this.type.id}`;
  }
  constructor(structType: Types.StructType) {
    this.type = structType;
  }
}

type EnumValue = EnumValueProper | EnumValueError | GenericError;

class EnumValueProper extends ValueProper {
  type: Types.EnumType;
  value: {
    name: string;
    numeric: BN;
  };
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return `${this.type.definingContract.typeName}.${this.type.typeName}.${this.name}`;
  }
  constructor(enumType: Types.EnumType, numeric: BN, name: string) {
    this.type = enumType;
    this.value = { name, numeric };
  }
};

class EnumValueError extends ValueError {
  type: Types.EnumType;
  error: EnumDecodingError;
  constructor(enumType: Types.EnumType, error: EnumDecodingError) {
    this.type = enumType;
    this.error = error;
  }
};

abstract class EnumDecodingError {
  type: Types.EnumType;
  raw: BN;
}

class EnumOutOfRangeError extends EnumDecodingError {
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    let typeName = this.type.definingContract.typeName + "." + this.type.typeName;
    return `Invalid ${typeName} (numeric value ${this.raw.toString()})`;
  }
  constructor(enumType: Types.EnumType, raw: BN) {
    this.type = enumType;
    this.raw = raw;
  }
}

class EnumNotFoundDecodingError extends EnumDecodingError {
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    let typeName = this.type.definingContract.typeName + "." + this.type.typeName;
    return `Unknown enum type ${typeName} of id ${this.type.id} (numeric value ${this.raw.toString()})`;
  }
  constructor(enumType: Types.EnumType, raw: BN) {
    this.type = enumType;
    this.raw = raw;
  }
}

type ContractValue = ContractValueProper | GenericError;

class ContractValueProper extends ValueProper {
  type: Types.ContractType;
  value: ContractValueDirect;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return util.inspect(this.value, options);
  }
  constructor(contractType: contractType, value: ContractValueDirect) {
    this.type = contractType;
    this.value = value;
  }
}

type ContractValueDirect = ContractValueDirectKnown | ContractValueDirectUnkown;

class ContractValueDirectKnown {
  address: string; //should be formatted as address
  //NOT an AddressValue, note
  kind: "known";
  class: Types.ContractType;
  //may have more optional members defined later, but I'll leave these out for now
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return options.stylize(this.address, "number") + ` (${this.class.typeName})`;
  }
  constructor(address: string, contractClass: Types.ContractType) {
    this.kind = "known";
    this.address = address;
    this.class = contractClass;
  }
}

class ContractValueDirectUnknown {
  address: string; //should be formatted as address
  //NOT an AddressValue, note
  kind: "unknown";
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return options.stylize(this.address, "number") + " of unknown contract class";
  }
  constructor(address: string) {
    this.kind = "unknown";
    this.address = address;
  }
}

type MagicValue = MagicValueProper | GenericError;

class MagicValueProper extends ValueProper {
  type: Types.MagicType;
  value: {
    [field: string]: Value
  };
  [util.inspect.custom](depth: number | null, options: InspectOptions): string | undefined {
    return util.inspect(value, options);
  }
  constructor(magicType: Types.MagicType, value: {[field: string]: Value}) {
    this.type = magicType;
    this.value = value;
  }
}

type FixedValue = FixedValueError; //FixedValueProper isn't ready yet, sorry!
type UfixedValue = UfixedValueError; //FixedValueProper isn't ready yet, sorry!

class FixedValueError extends ValueError {
  type: Types.FixedType;
  error: FixedDecodingError;
  constructor(dataType: Types.FixedType, raw: BN) {
    this.type = dataType;
    this.error = new FixedDecodingError(raw);
  }
}

class UfixedValueError extends ValueError {
  type: Types.UfixedType;
  error: FixedDecodingError;
  constructor(dataType: Types.UfixedType, raw: BN) {
    this.type = dataType;
    this.error = new FixedDecodingError(raw);
  }
}

//not distinguishing fixed vs ufixed here
class FixedDecodingError {
  raw: BN;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return `Fixed-point decoding not yet supported (raw value: ${this.raw.toString()})`;
  }
  constructor(raw: BN) {
    this.raw = raw;
  }
}

class UserDefinedTypeNotFoundError extends GenericErrorDirect {
  type: Types.UserDefinedType;
  message(): string {
    let typeName = this.type.definingContract.typeName + "." + this.type.typeName;
    return `Unknown ${this.type.typeClass} type ${typeName} of id ${this.type.id}`;
  }
  constructor(unknownType: Types.UserDefinedType) {
    this.type = unknownType;
  }
}

class UnsupportedConstantError extends GenericErrorDirect {
  definition: AstDefinition;
  message(): string {
    return `Unsupported constant type ${DefinitionUtils.typeClass(this.definition)}$`;
  }
  constructor(definition: AstDefinition) {
    this.definition = definition;
  }
}

class ReadErrorStack extends GenericErrorDirect {
  from: number;
  to: number;
  message(): string {
    return `Can't read stack from position ${this.from} to ${this.to}`;
  }
  constructor(from: number, to: number) {
    this.from = from;
    this.to = to;
  }
}

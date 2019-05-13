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
}

abstract class ValueError extends Value {
  error: DecoderError;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return util.inspect(this.error, options);
  }
};

type DecoderError = DecodeError | GenericErrorDirect;

abstract class GenericError extends ValueError {
  error: GenericErrorDirect;
}

abstract class GenericErrorDirect {
}

type DecodeError = BoolDecodingError | EnumDecodingError | FunctionInternalDecodingError;

type UintValue = UintValueProper | GenericError;

class UintValueProper extends ElementaryValueProper {
  type: Types.UintType;
  value: BN;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return options.stylize(this.value.toString(), "number");
  }
  toString() {
    return this.value.toString();
  }
  toSoliditySha3Input() {
    return {
      type: "uint",
      value: this.value
    }
  }
}

type IntValue = IntValueProper | GenericError;

class IntValueProper extends ValueProper {
  type: Types.IntType;
  value: BN;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return options.stylize(this.value.toString(), "number");
  }
  toString() {
    return this.value.toString();
  }
  toSoliditySha3Input() {
    return {
      type: "int",
      value: this.value
    }
  }
}

type BoolValue = BoolValueProper | BoolValueError | GenericError;

class BoolValueProper extends ValueProper {
  type: Types.BoolType;
  value: boolean;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return util.inspect(this.value, options);
  }
  toString() {
    return this.value.toString();
  }
  toSoliditySha3Input() {
    return {
      type: "uint",
      value: this.value ? new BN(1) : new BN(0)
    }
  }
}

class BoolValueError extends ValueError {
  type: Types.BoolType;
  error: BoolDecodingError;
}

class BoolDecodingError {
  raw: BN;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return `Invalid boolean (numeric value ${raw.toString()})`;
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
  toString() {
    return this.value;
  }
  toSoliditySha3Input(): {
    return {
      type: this.type.dynamic ? "bytes" : "bytes32",
      value: this.value
    }
  }
}

type AddressValue = AddressValueProper | GenericError;

class AddressValueProper extends ValueProper {
  type: Types.AddressType;
  value: string; //should have 0x and be checksum-cased
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return options.stylize(this.value, "number");
  }
  toString() {
    return value;
  }
  toSoliditySha3Input() {
    return {
      type: "uint",
      value: this.value
    }
  }
}

type StringValue = StringValueProper | GenericError;

class StringValueProper extends ValueProper {
  type: Types.StringType;
  value: string;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return util.inspect(this.value, options);
  }
  toString() {
    return value;
  }
  toSoliditySha3Input() {
    return {
      type: "string",
      value: this.value
    }
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
}

type FunctionValue = FunctionValueExternal | FunctionValueInternal;
type FunctionValueExternal = FunctionValueExternalProper | GenericError;
type FunctionValueInternal = FunctionValueInternalProper | FunctionValueInternalError | GenericError;

class FunctionValueExternalProper extends ValueProper {
  type: Types.FunctionType; //should be external, obviously
  value: {
    contract: ContractValueDirect;
    selector: BytesValue; //specifically a bytes4, but let's ignore that here
    name?: string;
  };
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    //first, let's inspect that contract, but w/o color
    let contractString = util.inspect(this.value.contract, { ...options, colors: false });
    //now, let's get the function name (or selector if unknown)
    let nameString = this.name !== undefined
      ? this.name
      : `Unknown function 0x${this.selector.value}`;
    //now, put it together
    return options.stylize(`[Function: ${nameString} of ${contractString}]`, "special");
  }
}

class FunctionValueInternalProper extends ValueProper {
  type: Types.FunctionType; //should be internal, obviously
  value: {
    context: Types.ContractType;
    deployedPc: number;
    constructorPc?: number;
    default?: boolean;
    name?: string;
    definedIn?: Types.ContractType; //must be defined if name is defined
  };
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    if(this.name !== undefined) {
      return options.stylize(`[Function: ${this.definedIn.typeName}.${this.name}]`, "special");
    } else if (this.default) {
      return options.stylize(`[Function: assert(false)]`, "special");
    } else if (this.deployedPc === 0) {
      return options.stylize(`[Function: <zero>]`, "special");
    } else {
      //for the contract decoder only! otherwise one of the above should be true
      return options.stylize(`[Function]`, "special");
    }
  }
}

class FunctionValueInternalError extends ValueError {
  type: Types.FunctionType; //should be internal, obviously
  error: FunctionInternalDecodingError;
}

abstract class FunctionInternalDecodingError {
  deployedPc: number;
  constructorPc: number;
}

class NoSuchInternalFunctionError extends FunctionInternalDecodingError {
  context: Types.ContractType;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return `Invalid function (Deployed PC=${deployedPc}, constructor PC=${constructorPc}) of contract ${context.typeName}`;
  }
}

class MalformedInternalFunctionError extends FunctionInternalDecodingError {
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return `Deployed-style function (Deployed PC=${deployedPc}, constructor PC=${constructorPC}) in constructor`;
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
};

class EnumValueError extends ValueError {
  type: Types.EnumType;
  error: EnumDecodingError;
};

class EnumDecodingError {
  raw: BN;
  type: Types.EnumType;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    let typeName = enumType.definingContract.typeName + "." + enumType.typeName;
    return `Invalid ${typeName} (numeric value ${BN.toString()})`;
  }
}

type ContractValue = ContractValueProper | GenericError;

class ContractValueProper extends ValueProper {
  type: Types.ContractType;
  value: ContractValueDirect;
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    return util.inspect(this.value, options);
  }
}

class ContractValueDirect {
  address: AddressValue;
  class?: Types.ContractType;
  //may have more optional members defined later, but I'll leave these out for now
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    let suffix = this.class
      ? `(${this.class.typeName})`
      : `of unknown contract class`;
    return options.stylize(this.value.address.value, "number") + " " + suffix;
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
}

abstract class ReadError extends GenericErrorDirect {
}

import * as Format from "@truffle/codec/format";
import * as Abi from "@truffle/abi-utils";
import * as Common from "@truffle/codec/common";

export interface Resolution {
  method: Method;
  arguments: Format.Values.Value[];
  options: Common.Options;
}

export interface Method {
  name?: string; //omitted for constructors
  selector: string; //bytecode for constructors
  inputs: Format.Types.OptionallyNamedType[];
  abi: Abi.FunctionEntry | Abi.ConstructorEntry;
}

export interface WrapOptions {
  userDefinedTypes?: Format.Types.TypesById;
  name?: string;
  loose?: boolean;
}

export interface ResolveOptions {
  userDefinedTypes?: Format.Types.TypesById;
  allowOptions?: boolean;
}

export interface ContractInput {
  address: string;
  selector: never; //contracts must *not* have a selector!
}

export interface FunctionExternalInput {
  address: any;
  selector: any;
}

export interface TypeValueInput {
  type: string;
  value: any;
}

export interface EncodingTextInput {
  encoding: "utf8"; //only encoding at present
  text: string;
}

export interface Uint8ArrayLikeInput {
  length: number;
  [index: number]: number;
}

//the following are for convenience
export type AddressLikeType =
  | Format.Types.AddressType
  | Format.Types.ContractType;

export type AddressLikeValue =
  | Format.Values.AddressValue
  | Format.Values.ContractValue;

export type IntegerOrEnumType =
  | Format.Types.UintType
  | Format.Types.IntType
  | Format.Types.EnumType;

export type DecimalType = Format.Types.FixedType | Format.Types.UfixedType;

export type NumericType =
  | DecimalType
  | Format.Types.UintType
  | Format.Types.IntType;

export type IntegerOrEnumValue =
  | Format.Values.UintValue
  | Format.Values.IntValue
  | Format.Values.EnumValue;

export type DecimalValue = Format.Values.FixedValue | Format.Values.UfixedValue;

export type TupleLikeType = Format.Types.TupleType | Format.Types.StructType;

export type TupleLikeValue =
  | Format.Values.TupleValue
  | Format.Values.StructValue;

import type * as Format from "@truffle/codec/format";
import type * as Abi from "@truffle/abi-utils";
import type * as Common from "@truffle/codec/common";
import type { WrapRequest, WrapResponse } from "../types";

/**
 * @Category Interfaces
 */
export interface Resolution {
  method: Method;
  arguments: Format.Values.Value[];
  options: Common.Options;
}

/**
 * This type represents a contract method or constructor.  Note that it's not a
 * method for a specific instance, so there's no address field.
 * @Category Interfaces
 */
export interface Method {
  /**
   * The method name; omitted for constructors.
   */
  name?: string;
  /**
   * The method selector; for a constructor, this is instead the (linked)
   * constructor bytecode.
   */
  selector: string;
  /**
   * The types of the inputs (each of which may optionally have a name).
   */
  inputs: Format.Types.OptionallyNamedType[];
  /**
   * The ABI entry for the method.
   */
  abi: Abi.FunctionEntry | Abi.ConstructorEntry;
}

export interface WrapOptions {
  userDefinedTypes?: Format.Types.TypesById;
  name?: string;
  loose?: boolean;
  oldOptionsBehavior?: boolean; //to not break Truffle Contract
  specificityFloor?: number; //raise all specificities to at least this much... should *not* propagate!
}

export interface ResolveOptions {
  userDefinedTypes?: Format.Types.TypesById;
  allowOptions?: boolean;
}

export type Case<TypeType, ValueType, RequestType> =
  (dataType: TypeType, input: unknown, options: WrapOptions)
    => Generator<RequestType, ValueType, WrapResponse>;

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

export interface Uint8ArrayLike {
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

export type IntegerType = Format.Types.UintType | Format.Types.IntType;

export type IntegerOrEnumType = IntegerType | Format.Types.EnumType;

export type DecimalType = Format.Types.FixedType | Format.Types.UfixedType;

export type NumericType = IntegerType | DecimalType;

export type IntegerValue = Format.Values.UintValue | Format.Values.IntValue;

export type IntegerOrEnumValue = IntegerValue | Format.Values.EnumValue;

export type DecimalValue = Format.Values.FixedValue | Format.Values.UfixedValue;

export type TupleLikeType = Format.Types.TupleType | Format.Types.StructType;

export type TupleLikeValue =
  | Format.Values.TupleValue
  | Format.Values.StructValue;

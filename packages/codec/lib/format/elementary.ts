import BN from "bn.js";
import Big from "big.js";
import * as Types from "./types";

//note that we often want an elementary *value*, and not an error!
//so let's define those types too
export type ElementaryValue = UintValue | IntValue | BoolValue
  | BytesValue | AddressValue | StringValue | FixedValue | UfixedValue;
export type BytesValue = BytesStaticValue | BytesDynamicValue;


//Uints
export interface UintValue {
  type: Types.UintType;
  kind: "value";
  value: {
    asBN: BN;
    rawAsBN?: BN;
  };
}

//Ints
export interface IntValue {
  type: Types.IntType;
  kind: "value";
  value: {
    asBN: BN;
    rawAsBN?: BN;
  };
}

//Bools
export interface BoolValue {
  type: Types.BoolType;
  kind: "value";
  value: {
    asBoolean: boolean;
  };
}

//bytes (static)
export interface BytesStaticValue {
  type: Types.BytesTypeStatic;
  kind: "value";
  value: {
    /**
     * should be hex-formatted, with leading "0x"
     */
    asHex: string;
    rawAsHex?: string;
  };
}

//bytes (dynamic)
export interface BytesDynamicValue {
  type: Types.BytesTypeDynamic;
  kind: "value";
  value: {
    /**
     * should be hex-formatted, with leading "0x"
     */
    asHex: string;
  };
}

//addresses
export interface AddressValue {
  type: Types.AddressType;
  kind: "value";
  value: {
    /**
     * should have leading "0x" and be checksum-cased
     */
    asAddress: string;
    /**
     * just a hex string, so no checksum
     */
    rawAsHex?: string;
  }
}

//strings
//strings have a special new type as their value: StringValueInfo
export interface StringValue {
  type: Types.StringType;
  kind: "value";
  value: StringValueInfo;
}


/**
 * these come in two types: valid strings and malformed strings
 */
export type StringValueInfo = StringValueInfoValid | StringValueInfoMalformed;

/**
 * valid strings
 */
export interface StringValueInfoValid {
  kind: "valid";
  asString: string;
}

/**
 * malformed strings
 */
export interface StringValueInfoMalformed {
  kind: "malformed";
  /**
   * should be hex-formatted, with leading "0x"
   */
  asHex: string;
}

//Fixed & Ufixed
export interface FixedValue {
  type: Types.FixedType;
  kind: "value";
  value: {
    asBig: Big;
    rawAsBig?: Big;
  };
}

export interface UfixedValue {
  type: Types.UfixedType;
  kind: "value";
  value: {
    asBig: Big;
    rawAsBig?: Big;
  };
}

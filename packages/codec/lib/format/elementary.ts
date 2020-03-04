import BN from "bn.js";
import Big from "big.js";
import * as Types from "./types";

//note that we often want an elementary *value*, and not an error!
//so let's define those types too
/**
 * An elementary value
 *
 * @Category General categories
 */
export type ElementaryValue =
  | UintValue
  | IntValue
  | BoolValue
  | BytesValue
  | AddressValue
  | StringValue
  | FixedValue
  | UfixedValue
  | EnumValue
  | ContractValue;

/**
 * A bytestring value (static or dynamic)
 *
 * @Category Elementary types
 */
export type BytesValue = BytesStaticValue | BytesDynamicValue;

/**
 * An unsigned integer value
 *
 * @Category Elementary types
 */
export interface UintValue {
  type: Types.UintType;
  kind: "value";
  value: {
    asBN: BN;
    rawAsBN?: BN;
  };
}

/**
 * A signed integer value
 *
 * @Category Elementary types
 */
export interface IntValue {
  type: Types.IntType;
  kind: "value";
  value: {
    asBN: BN;
    rawAsBN?: BN;
  };
}

/**
 * A boolean value
 *
 * @Category Elementary types
 */
export interface BoolValue {
  type: Types.BoolType;
  kind: "value";
  value: {
    asBoolean: boolean;
  };
}

/**
 * A bytestring value (static length)
 *
 * @Category Elementary types
 */
export interface BytesStaticValue {
  type: Types.BytesTypeStatic;
  kind: "value";
  value: {
    /**
     * hex-formatted, with leading "0x"
     */
    asHex: string;
    rawAsHex?: string;
  };
}

/**
 * A bytestring value (dynamic length)
 *
 * @Category Elementary types
 */
export interface BytesDynamicValue {
  type: Types.BytesTypeDynamic;
  kind: "value";
  value: {
    /**
     * hex-formatted, with leading "0x"
     */
    asHex: string;
  };
}

/**
 * An address value
 *
 * @Category Elementary types
 */
export interface AddressValue {
  type: Types.AddressType;
  kind: "value";
  value: {
    /**
     * has leading "0x" and is checksum-cased
     */
    asAddress: string;
    /**
     * just a hex string, so no checksum
     */
    rawAsHex?: string;
  };
}

/**
 * A string value; see [[StringValueInfo]] for more detail
 *
 * @Category Elementary types
 */
export interface StringValue {
  type: Types.StringType;
  kind: "value";
  value: StringValueInfo;
}

/**
 * These come in two types: valid strings and malformed strings.
 *
 * @Category Elementary types
 */
export type StringValueInfo = StringValueInfoValid | StringValueInfoMalformed;

/**
 * This type of StringValueInfo represents a valid UTF-8 string.
 *
 * @Category Elementary types
 */
export interface StringValueInfoValid {
  kind: "valid";
  asString: string;
}

/**
 * This type of StringValueInfo represents a malformed string.
 *
 * @Category Elementary types
 */
export interface StringValueInfoMalformed {
  kind: "malformed";
  /**
   * hex-formatted, with leading "0x"
   */
  asHex: string;
}

/**
 * A signed fixed-point value
 *
 * @Category Elementary types
 */
export interface FixedValue {
  type: Types.FixedType;
  kind: "value";
  value: {
    asBig: Big;
    rawAsBig?: Big;
  };
}

/**
 * An unsigned fixed-point value
 *
 * @Category Elementary types
 */
export interface UfixedValue {
  type: Types.UfixedType;
  kind: "value";
  value: {
    asBig: Big;
    rawAsBig?: Big;
  };
}

/**
 * An enum value
 *
 * @Category User-defined elementary types
 */
export interface EnumValue {
  type: Types.EnumType;
  kind: "value";
  value: {
    name: string;
    /**
     * the numeric value of the enum
     */
    numericAsBN: BN;
  };
}

/**
 * A contract value; see [[ContractValueInfo]] for more detail
 *
 * @Category User-defined elementary types
 */
export interface ContractValue {
  type: Types.ContractType;
  kind: "value";
  value: ContractValueInfo;
}

/**
 * There are two types -- one for contracts whose class we can identify, and one
 * for when we can't identify the class.
 *
 * @Category User-defined elementary types
 */
export type ContractValueInfo =
  | ContractValueInfoKnown
  | ContractValueInfoUnknown;

/**
 * This type of ContractValueInfo is used when we can identify the class.
 *
 * @Category User-defined elementary types
 */
export interface ContractValueInfoKnown {
  kind: "known";
  /**
   * formatted as address (leading "0x", checksum-cased);
   * note that this is not an AddressResult!
   */
  address: string;
  /**
   * this is just a hexstring; no checksum (also may have padding beforehand)
   */
  rawAddress?: string;
  class: Types.ContractType;
  //may have more optional members defined later, but I'll leave these out for now
}

/**
 * This type of ContractValueInfo is used when we can't identify the class.
 *
 * @Category User-defined elementary types
 */
export interface ContractValueInfoUnknown {
  kind: "unknown";
  /**
   * formatted as address (leading "0x", checksum-cased);
   * note that this is not an AddressResult!
   */
  address: string;
  /**
   * this is just a hexstring; no checksum (also may have padding beforehand)
   */
  rawAddress?: string;
}

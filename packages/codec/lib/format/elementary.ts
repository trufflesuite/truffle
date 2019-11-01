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
  | UfixedValue;
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

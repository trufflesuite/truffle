import BN from "bn.js";
import Big from "big.js";
import * as Types from "./types";
import * as Config from "./config";

//note that we often want an elementary *value*, and not an error!
//so let's define those types too
/**
 * An elementary value
 *
 * @Category General categories
 */
export type ElementaryValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> =
  | UintValue<C>
  | IntValue<C>
  | BoolValue<C>
  | BytesValue<C>
  | AddressValue<C>
  | StringValue<C>
  | FixedValue<C>
  | UfixedValue<C>
  | EnumValue<C>
  | ContractValue<C>;

/**
 * A bytestring value (static or dynamic)
 *
 * @Category Elementary types
 */
export type BytesValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = BytesStaticValue<C> | BytesDynamicValue<C>;

/**
 * An unsigned integer value
 *
 * @Category Elementary types
 */
export interface UintValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.UintType<C>;
  kind: "value";
  value: IntegerValueInfo[C["integerType"]];
}

interface IntegerValueInfo {
  BN: {
    asBN: BN;
    rawAsBN?: BN;
  };
  string: {
    asString: string;
    rawAsString?: string;
  };
}

/**
 * A signed integer value
 *
 * @Category Elementary types
 */
export interface IntValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.IntType<C>;
  kind: "value";
  value: IntegerValueInfo[C["integerType"]];
}

/**
 * A boolean value
 *
 * @Category Elementary types
 */
export interface BoolValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.BoolType<C>;
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
export interface BytesStaticValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.BytesTypeStatic<C>;
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
export interface BytesDynamicValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.BytesTypeDynamic<C>;
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
export interface AddressValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.AddressType<C>;
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
export interface StringValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.StringType<C>;
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
export interface FixedValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.FixedType<C>;
  kind: "value";
  value: DecimalValueInfo[C["decimalType"]];
}

interface DecimalValueInfo {
  Big: {
    asBig: Big;
    rawAsBig?: Big;
  };
  string: {
    asString: string;
    rawAsString?: string;
  };
}

/**
 * An unsigned fixed-point value
 *
 * @Category Elementary types
 */
export interface UfixedValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.UfixedType;
  kind: "value";
  value: DecimalValueInfo[C["decimalType"]];
}

/**
 * An enum value
 *
 * @Category User-defined elementary types
 */
export interface EnumValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.EnumType;
  kind: "value";
  value: EnumValueBaseFields & EnumValueNumericFields[C["integerType"]];
}

interface EnumValueBaseFields {
  name: string;
}

interface EnumValueNumericFields {
  BN: {
    /**
     * the numeric value of the enum
     */
    numericAsBN: BN;
  };
  string: {
    /**
     * the numeric value of the enum
     */
    numericAsString: string;
  };
}

/**
 * A contract value; see [[ContractValueInfo]] for more detail
 *
 * @Category User-defined elementary types
 */
export interface ContractValue<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  type: Types.ContractType<C>;
  kind: "value";
  value: ContractValueInfo<C>;
}

/**
 * There are two types -- one for contracts whose class we can identify, and one
 * for when we can't identify the class.
 *
 * @Category User-defined elementary types
 */
export type ContractValueInfo<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = ContractValueInfoKnown<C> | ContractValueInfoUnknown;

/**
 * This type of ContractValueInfo is used when we can identify the class.
 *
 * @Category User-defined elementary types
 */
export interface ContractValueInfoKnown<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
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
  class: Types.ContractType<C>;
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

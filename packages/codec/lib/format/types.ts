import debugModule from "debug";
const debug = debugModule("codec:format:types");

//type objects for Solidity types
//these will just be defined as interfaces; there's not any particular need for
//classes here (at least for now)

//Note: This is NOT intended to represent every possible type representable by
//a Solidity type identifier!  Only possible types the decoder might need to
//output, not all possible values.

//NOTE: not all of these optional fields are actually implemented. Some are
//just intended for the future.
//ALSO NOTE: IDs are strings even though they're currently numeric because
//that might change in the future.

import BN from "bn.js";
import { ContractKind, Location, Mutability } from "@truffle/codec/common";

import * as Config from "./config";

/**
 * Object representing a type
 *
 * @Category General categories
 */
export type Type<C extends Config.FormatConfig = Config.DefaultFormatConfig> =
  | UintType<C>
  | IntType<C>
  | BoolType<C>
  | BytesType<C>
  | AddressType<C>
  | FixedType<C>
  | UfixedType<C>
  | StringType<C>
  | ArrayType<C>
  | MappingType<C>
  | FunctionType<C>
  | StructType<C>
  | EnumType<C>
  | ContractType<C>
  | MagicType<C>
  | TypeType<C>
  | TupleType<C>;

/**
 * Type of an unsigned integer
 *
 * @Category Elementary types
 */
export interface UintType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "uint";
  bits: number;
  typeHint?: string;
}

/**
 * Type of a signed integer
 *
 * @Category Elementary types
 */
export interface IntType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "int";
  bits: number;
  typeHint?: string;
}

/**
 * Type of a boolean
 *
 * @Category Elementary types
 */
export interface BoolType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "bool";
  typeHint?: string;
}

/**
 * Type of a bytestring (static or dynamic)
 *
 * @Category Elementary types
 */
export type BytesType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = BytesTypeStatic<C> | BytesTypeDynamic<C>;

/**
 * Type of a static-length bytestring
 *
 * @Category Elementary types
 */
export interface BytesTypeStatic<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "bytes";
  kind: "static";
  length: number;
  typeHint?: string;
}

/**
 * Type of a dynamic-length bytestring
 *
 * @Category Elementary types
 */
export interface BytesTypeDynamic<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "bytes";
  kind: "dynamic";
  location?: Location;
  typeHint?: string;
}

/**
 * Type of an address
 *
 * @Category Elementary types
 */
export type AddressType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = AddressTypeSpecific<C> | AddressTypeGeneral<C>;

/**
 * Type of an address (with payability specified)
 *
 * @Category Elementary types
 */
export interface AddressTypeSpecific<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "address";
  kind: "specific";
  payable: boolean;
}

/**
 * Type of an address (with payability unspecified)
 *
 * @Category Elementary types
 */
export interface AddressTypeGeneral<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "address";
  kind: "general";
  typeHint?: string;
}

/**
 * Type of a string
 *
 * @Category Elementary types
 */
export interface StringType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "string";
  location?: Location;
  typeHint?: string;
}

/**
 * Type of a signed fixed-point number
 *
 * @Category Elementary types
 */
export interface FixedType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "fixed";
  bits: number;
  places: number;
  typeHint?: string;
}

/**
 * Type of an unsigned fixed-point number
 *
 * @Category Elementary types
 */
export interface UfixedType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "ufixed";
  bits: number;
  places: number;
  typeHint?: string;
}

/**
 * Type of an array
 *
 * @Category Container types
 */
export type ArrayType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = ArrayTypeStatic<C> | ArrayTypeDynamic<C>;

/**
 * Type of a static-length array
 *
 * @Category Container types
 */
export type ArrayTypeStatic<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = ArrayTypeStaticBaseFields<C> & ArrayTypeStaticLengthField[C["integerType"]];

interface ArrayTypeStaticBaseFields<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "array";
  kind: "static";
  baseType: Type<C>;
  location?: Location;
  typeHint?: string;
}

interface ArrayTypeStaticLengthField {
  BN: {
    length: BN;
  };
  string: {
    lengthAsString: string;
  };
}

/**
 * Type of a dynamic-length array
 *
 * @Category Container types
 */
export interface ArrayTypeDynamic<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "array";
  kind: "dynamic";
  baseType: Type<C>;
  location?: Location;
  typeHint?: string;
}

/**
 * Type of an elementary value
 *
 * @Category General categories
 */
export type ElementaryType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> =
  | UintType<C>
  | IntType<C>
  | BoolType<C>
  | BytesType<C>
  | FixedType<C>
  | UfixedType<C>
  | AddressType<C>
  | StringType<C>
  | EnumType<C>
  | ContractType<C>;

/**
 * Type of a mapping
 *
 * @Category Container types
 */
export interface MappingType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "mapping";
  keyType: ElementaryType<C>;
  valueType: Type<C>;
  location?: "storage";
}

/**
 * Type of a function pointer (internal or external)
 *
 * @Category Function types
 */
export type FunctionType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = FunctionInternalType<C> | FunctionExternalType<C>;

/**
 * Type of an internal function pointer
 *
 * @Category Function types
 */
export interface FunctionInternalType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "function";
  visibility: "internal";
  mutability: Mutability;
  inputParameterTypes: Type<C>[];
  outputParameterTypes: Type<C>[];
  //we do not presently support bound functions
}

/**
 * Type of an external function pointer
 *
 * @Category Function types
 */
export type FunctionExternalType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = FunctionExternalTypeSpecific<C> | FunctionExternalTypeGeneral<C>;

/**
 * Type of an external function pointer (full Solidity type)
 *
 * @Category Function types
 */
export interface FunctionExternalTypeSpecific<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "function";
  visibility: "external";
  kind: "specific";
  mutability: Mutability;
  inputParameterTypes: Type<C>[];
  outputParameterTypes: Type<C>[];
  //we do not presently support bound functions
}

/**
 * Type of an external function pointer (general ABI type)
 *
 * @Category Function types
 */
export interface FunctionExternalTypeGeneral<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "function";
  visibility: "external";
  kind: "general";
  //we do not presently support bound functions
  typeHint?: string;
}

/**
 * Types defined inside contracts
 *
 * @Category General categories
 */
export type ContractDefinedType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = StructTypeLocal<C> | EnumTypeLocal<C>;

/**
 * User-defined types
 *
 * @Category General categories
 */
export type UserDefinedType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> =
  | ContractDefinedType<C>
  | ContractTypeNative<C>
  | StructTypeGlobal<C>
  | EnumTypeGlobal<C>;

/**
 * Type of a struct
 *
 * Structs may be local (defined in a contract) or global (defined outside of any contract)
 *
 * @Category Container types
 */
export type StructType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = StructTypeLocal<C> | StructTypeGlobal<C>;

export interface NameTypePair<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  name: string;
  type: Type<C>;
}

/**
 * Local structs (defined in contracts)
 *
 * @Category Container types
 */
export interface StructTypeLocal<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "struct";
  kind: "local";
  /**
   * Internal ID.  Format may change in future.
   */
  id: string;
  typeName: string;
  definingContractName: string;
  definingContract?: ContractTypeNative<C>;
  /**
   * these must be in order
   */
  memberTypes?: NameTypePair<C>[];
  location?: Location;
}

/**
 * Global structs
 *
 * @Category Container types
 */
export interface StructTypeGlobal<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "struct";
  kind: "global";
  /**
   * Internal ID.  Format may change in future.
   */
  id: string;
  typeName: string;
  /**
   * these must be in order
   */
  memberTypes?: NameTypePair<C>[];
  location?: Location;
}

export interface OptionallyNamedType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  name?: string;
  type: Type<C>;
}

/**
 * Type of a tuple (for use in ABI)
 *
 * @Category Container types
 */
export interface TupleType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "tuple";
  memberTypes: OptionallyNamedType<C>[];
  typeHint?: string;
}

/**
 * Type of an enum
 *
 * Enums may be local (defined in a contract) or global (defined outside of any contract)
 *
 * @Category User-defined elementary types
 */
export type EnumType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = EnumTypeLocal<C> | EnumTypeGlobal<C>;

/**
 * Local enum (defined in a contract)
 *
 * @Category User-defined elementary types
 */
export interface EnumTypeLocal<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "enum";
  kind: "local";
  /**
   * Internal ID.  Format may change in future.
   */
  id: string;
  typeName: string;
  definingContractName: string;
  definingContract?: ContractTypeNative<C>;
  /**
   * these must be in order
   */
  options?: string[];
}

/**
 * Global enum
 *
 * @Category User-defined elementary types
 */
export interface EnumTypeGlobal<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "enum";
  kind: "global";
  /**
   * Internal ID.  Format may change in future.
   */
  id: string;
  typeName: string;
  /**
   * these must be in order
   */
  options?: string[];
}

/**
 * Type of a contract; used not just for actual values but wherever a contract type
 * is needed
 *
 * Contract types may be native (has Solidity info) or foreign (lacking Solidity info).
 *
 * @Category User-defined elementary types
 */
export type ContractType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = ContractTypeNative<C> | ContractTypeForeign<C>;

/**
 * Type of a contract with full Solidity info -- may be used for actual variables
 *
 * @Category User-defined elemntary types
 */
export interface ContractTypeNative<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "contract";
  kind: "native";
  /**
   * Internal ID.  Format may change in future.
   */
  id: string;
  typeName: string;
  contractKind?: ContractKind;
  /**
   * Indicates whether contract has payable fallback function
   */
  payable?: boolean; //will be useful in the future
  //may have more optional members defined later, but I'll leave these out for
  //now
}

/**
 * Type of a contract w/o full Solidity info -- not used for actual variables
 *
 * @Category User-defined elementary types
 */
export interface ContractTypeForeign<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "contract";
  kind: "foreign";
  typeName: string;
  contractKind?: ContractKind;
  /**
   * Indicates whether contract has payable fallback function
   */
  payable?: boolean; //will be useful in the future
  //may have more optional members defined later, but I'll leave these out for
  //now
}

export type MagicVariableName = "message" | "block" | "transaction";

/**
 * Type of a magic variable
 *
 * @Category Special container types (debugger-only)
 */
export interface MagicType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "magic";
  variable: MagicVariableName;
  //really, I could do this as a tagged union, but I don't see a reason to
  //introduce such complexity here, especially as this type is basically just
  //for the debugger
  memberTypes?: {
    [field: string]: Type<C>;
  };
  //may have more optional fields defined in the future
}

/**
 * Type of a type!  This is currently only used for contract types, but
 * may expand in the future.
 * @Category Special container types (debugger-only)
 */
export interface TypeType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  typeClass: "type";
  type: ContractTypeNative<C>;
  /**
   * these must be in order, and must only include
   * **non-inherited** state variables
   */
  stateVariableTypes?: NameTypePair<C>[];
}

/**
 * Reference types
 *
 * @Category General categories
 */
export type ReferenceType<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> =
  | ArrayType<C>
  | MappingType<C>
  | StructType<C>
  | StringType<C>
  | BytesTypeDynamic<C>;

//not bother parameterizing things further, since the following tools are meant
//for use with "live" types, not serialized ones

export interface TypesById {
  [id: string]: UserDefinedType;
}

function isUserDefinedType(anyType: Type): anyType is UserDefinedType {
  const userDefinedTypes = ["contract", "enum", "struct"];
  return userDefinedTypes.includes(anyType.typeClass);
}

export function isReferenceType(anyType: Type): anyType is ReferenceType {
  const alwaysReferenceTypes = ["array", "mapping", "struct", "string"];
  if (alwaysReferenceTypes.includes(anyType.typeClass)) {
    return true;
  } else if (anyType.typeClass === "bytes") {
    return anyType.kind === "dynamic";
  } else {
    return false;
  }
}

//one could define a counterpart function that stripped all unnecessary information
//from the type object, but at the moment I see no need for that
export function fullType(basicType: Type, userDefinedTypes: TypesById): Type {
  if (!isUserDefinedType(basicType)) {
    return basicType;
  }
  let id = basicType.id;
  let storedType = userDefinedTypes[id];
  if (!storedType) {
    return basicType;
  }
  let returnType: Type = { ...basicType, ...storedType };
  if (isReferenceType(basicType) && basicType.location !== undefined) {
    returnType = specifyLocation(returnType, basicType.location);
  }
  return returnType;
}

//the location argument here always forces, so passing undefined *will* force undefined
export function specifyLocation(
  dataType: Type,
  location: Location | undefined
): Type {
  if (isReferenceType(dataType)) {
    switch (dataType.typeClass) {
      case "string":
      case "bytes":
        return { ...dataType, location };
      case "array":
        return {
          ...dataType,
          location,
          baseType: specifyLocation(dataType.baseType, location)
        };
      case "mapping":
        let newLocation =
          location === "storage" ? ("storage" as "storage") : undefined;
        return {
          ...dataType,
          location: newLocation,
          valueType: specifyLocation(dataType.valueType, newLocation)
        };
      case "struct":
        let returnType = { ...dataType, location };
        if (returnType.memberTypes) {
          returnType.memberTypes = returnType.memberTypes.map(
            ({ name: memberName, type: memberType }) => ({
              name: memberName,
              type: specifyLocation(memberType, location)
            })
          );
        }
        return returnType;
    }
  } else {
    return dataType;
  }
}

//NOTE: the following two functions might not be exactly right for weird internal stuff,
//or for ABI-only stuff.  (E.g. for internal stuff sometimes it records whether things
//are pointers or not??  we don't track that so we can't recreate that)
//But what can you do.

export function typeString(dataType: Type): string {
  let baseString = typeStringWithoutLocation(dataType);
  if (isReferenceType(dataType) && dataType.location) {
    return baseString + " " + dataType.location;
  } else {
    return baseString;
  }
}

export function typeStringWithoutLocation(dataType: Type): string {
  switch (dataType.typeClass) {
    case "uint":
      return dataType.typeHint || `uint${dataType.bits}`;
    case "int":
      return dataType.typeHint || `int${dataType.bits}`;
    case "bool":
      return dataType.typeHint || "bool";
    case "bytes":
      if (dataType.typeHint) {
        return dataType.typeHint;
      }
      switch (dataType.kind) {
        case "dynamic":
          return "bytes";
        case "static":
          return `bytes${dataType.length}`;
      }
    case "address":
      switch (dataType.kind) {
        case "general":
          return dataType.typeHint || "address"; //I guess?
        case "specific":
          return dataType.payable ? "address payable" : "address";
      }
    case "string":
      return dataType.typeHint || "string";
    case "fixed":
      return dataType.typeHint || `fixed${dataType.bits}x${dataType.places}`;
    case "ufixed":
      return dataType.typeHint || `ufixed${dataType.bits}x${dataType.places}`;
    case "array":
      if (dataType.typeHint) {
        return dataType.typeHint;
      }
      switch (dataType.kind) {
        case "dynamic":
          return `${typeStringWithoutLocation(dataType.baseType)}[]`;
        case "static":
          return `${typeStringWithoutLocation(dataType.baseType)}[${
            dataType.length
          }]`;
      }
    case "mapping":
      return `mapping(${typeStringWithoutLocation(
        dataType.keyType
      )} => ${typeStringWithoutLocation(dataType.valueType)})`;
    case "struct":
    case "enum":
      //combining these cases for simplicity
      switch (dataType.kind) {
        case "local":
          return `${dataType.typeClass} ${dataType.definingContractName}.${
            dataType.typeName
          }`;
        case "global":
          return `${dataType.typeClass} ${dataType.typeName}`;
      }
    case "tuple":
      return (
        dataType.typeHint ||
        "tuple(" +
          dataType.memberTypes
            .map(memberType => typeString(memberType.type))
            .join(",") +
          ")"
      ); //note that we do include location and do not put spaces
    case "contract":
      return dataType.contractKind + " " + dataType.typeName;
    case "magic":
      //no, this is not transposed!
      const variableNames = {
        message: "msg",
        transaction: "tx",
        block: "block"
      };
      return variableNames[dataType.variable];
    case "function":
      let visibilityString: string;
      switch (dataType.visibility) {
        case "external":
          if (dataType.kind === "general") {
            if (dataType.typeHint) {
              return dataType.typeHint;
            } else {
              return "function external"; //I guess???
            }
          }
          visibilityString = " external"; //note the deliberate space!
          break;
        case "internal":
          visibilityString = "";
          break;
      }
      let mutabilityString =
        dataType.mutability === "nonpayable" ? "" : " " + dataType.mutability; //again, note the deliberate space
      let inputList = dataType.inputParameterTypes.map(typeString).join(","); //note that we do include location, and do not put spaces
      let outputList = dataType.outputParameterTypes.map(typeString).join(",");
      let inputString = `function(${inputList})`;
      let outputString = outputList === "" ? "" : ` returns (${outputList})`; //again, note the deliberate space
      return inputString + mutabilityString + visibilityString + outputString;
  }
}

export function isContractDefinedType(
  anyType: Type
): anyType is ContractDefinedType {
  const contractDefinedTypes = ["enum", "struct"];
  return contractDefinedTypes.includes(anyType.typeClass);
}

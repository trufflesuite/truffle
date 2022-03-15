/**
 * Contains the types for type objects, and some
 * functions for working with them.
 *
 * @category Main Format
 *
 * @packageDocumentation
 */

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

import type BN from "bn.js";
import type { ContractKind, Location, Mutability } from "@truffle/codec/common";
import type { CompilerVersion } from "@truffle/codec/compiler";

/**
 * Object representing a type
 *
 * @Category General categories
 */
export type Type =
  | UintType
  | IntType
  | BoolType
  | BytesType
  | AddressType
  | FixedType
  | UfixedType
  | StringType
  | ArrayType
  | MappingType
  | FunctionType
  | StructType
  | EnumType
  | UserDefinedValueTypeType
  | ContractType
  | MagicType
  | TypeType
  | TupleType
  | OptionsType;

/**
 * Type of an unsigned integer
 *
 * @Category Elementary types
 */
export interface UintType {
  typeClass: "uint";
  bits: number;
  typeHint?: string;
}

/**
 * Type of a signed integer
 *
 * @Category Elementary types
 */
export interface IntType {
  typeClass: "int";
  bits: number;
  typeHint?: string;
}

/**
 * Type of a boolean
 *
 * @Category Elementary types
 */
export interface BoolType {
  typeClass: "bool";
  typeHint?: string;
}

/**
 * Type of a bytestring (static or dynamic)
 *
 * @Category Elementary types
 */
export type BytesType = BytesTypeStatic | BytesTypeDynamic;

/**
 * Type of a static-length bytestring
 *
 * @Category Elementary types
 */
export interface BytesTypeStatic {
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
export interface BytesTypeDynamic {
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
export type AddressType = AddressTypeSpecific | AddressTypeGeneral;

/**
 * Type of an address (with payability specified)
 *
 * @Category Elementary types
 */
export interface AddressTypeSpecific {
  typeClass: "address";
  kind: "specific";
  payable: boolean;
}

/**
 * Type of an address (with payability unspecified)
 *
 * @Category Elementary types
 */
export interface AddressTypeGeneral {
  typeClass: "address";
  kind: "general";
  typeHint?: string;
}

/**
 * Type of a string
 *
 * @Category Elementary types
 */
export interface StringType {
  typeClass: "string";
  location?: Location;
  typeHint?: string;
}

/**
 * Type of a signed fixed-point number
 *
 * @Category Elementary types
 */
export interface FixedType {
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
export interface UfixedType {
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
export type ArrayType = ArrayTypeStatic | ArrayTypeDynamic;

/**
 * Type of a static-length array
 *
 * @Category Container types
 */
export interface ArrayTypeStatic {
  typeClass: "array";
  kind: "static";
  baseType: Type;
  length: BN;
  location?: Location;
  typeHint?: string;
}

/**
 * Type of a dynamic-length array
 *
 * @Category Container types
 */
export interface ArrayTypeDynamic {
  typeClass: "array";
  kind: "dynamic";
  baseType: Type;
  location?: Location;
  typeHint?: string;
}

/**
 * Type of an elementary value
 *
 * @Category General categories
 */
export type ElementaryType =
  | UintType
  | IntType
  | BoolType
  | BytesType
  | FixedType
  | UfixedType
  | AddressType
  | StringType
  | EnumType
  | UserDefinedValueTypeType
  | ContractType;

/**
 * Types that can underlie a user-defined value type
 *
 * @Category General categories
 */
export type BuiltInValueType =
  | UintType
  | IntType
  | BoolType
  | BytesTypeStatic
  | FixedType
  | UfixedType
  | AddressTypeSpecific; //UDVTs only exist on 0.8.8 and later

/**
 * Types that can go in the ABI
 *
 * @Category General categories
 */
export type AbiType =
  | UintType
  | IntType
  | BoolType
  | BytesType
  | AddressTypeGeneral
  | FixedType
  | UfixedType
  | StringType
  | ArrayType
  | FunctionExternalTypeGeneral
  | TupleType;

/**
 * Type of a mapping
 *
 * @Category Container types
 */
export interface MappingType {
  typeClass: "mapping";
  keyType: ElementaryType;
  valueType: Type;
  location?: "storage";
}

/**
 * Type of a function pointer (internal or external)
 *
 * @Category Function types
 */
export type FunctionType = FunctionInternalType | FunctionExternalType;

/**
 * Type of an internal function pointer
 *
 * @Category Function types
 */
export interface FunctionInternalType {
  typeClass: "function";
  visibility: "internal";
  mutability: Mutability;
  inputParameterTypes: Type[];
  outputParameterTypes: Type[];
  //we do not presently support bound functions
}

/**
 * Type of an external function pointer
 *
 * @Category Function types
 */
export type FunctionExternalType =
  | FunctionExternalTypeSpecific
  | FunctionExternalTypeGeneral;

/**
 * Type of an external function pointer (full Solidity type)
 *
 * @Category Function types
 */
export interface FunctionExternalTypeSpecific {
  typeClass: "function";
  visibility: "external";
  kind: "specific";
  mutability: Mutability;
  inputParameterTypes: Type[];
  outputParameterTypes: Type[];
  //we do not presently support bound functions
}

/**
 * Type of an external function pointer (general ABI type)
 *
 * @Category Function types
 */
export interface FunctionExternalTypeGeneral {
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
export type ContractDefinedType =
  | StructTypeLocal
  | EnumTypeLocal
  | UserDefinedValueTypeTypeLocal;

/**
 * User-defined types
 *
 * @Category General categories
 */
export type UserDefinedType =
  | ContractDefinedType
  | ContractTypeNative
  | StructTypeGlobal
  | EnumTypeGlobal
  | UserDefinedValueTypeTypeGlobal;

/**
 * Type of a struct
 *
 * Structs may be local (defined in a contract) or global (defined outside of any contract)
 *
 * @Category Container types
 */
export type StructType = StructTypeLocal | StructTypeGlobal;

export interface NameTypePair {
  name: string;
  type: Type;
}

/**
 * Local structs (defined in contracts)
 *
 * @Category Container types
 */
export interface StructTypeLocal {
  typeClass: "struct";
  kind: "local";
  /**
   * Internal ID.  Format may change in future.
   */
  id: string;
  typeName: string;
  definingContractName: string;
  definingContract?: ContractTypeNative;
  /**
   * these must be in order
   */
  memberTypes?: NameTypePair[];
  location?: Location;
}

/**
 * Global structs
 *
 * @Category Container types
 */
export interface StructTypeGlobal {
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
  memberTypes?: NameTypePair[];
  location?: Location;
}

export interface OptionallyNamedType {
  name?: string;
  type: Type;
}

/**
 * Type of a tuple (for use in ABI)
 *
 * @Category Container types
 */
export interface TupleType {
  typeClass: "tuple";
  memberTypes: OptionallyNamedType[];
  typeHint?: string;
}

/**
 * Type of an enum
 *
 * Enums may be local (defined in a contract) or global (defined outside of any contract)
 *
 * @Category User-defined elementary types
 */
export type EnumType = EnumTypeLocal | EnumTypeGlobal;

/**
 * Local enum (defined in a contract)
 *
 * @Category User-defined elementary types
 */
export interface EnumTypeLocal {
  typeClass: "enum";
  kind: "local";
  /**
   * Internal ID.  Format may change in future.
   */
  id: string;
  typeName: string;
  definingContractName: string;
  definingContract?: ContractTypeNative;
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
export interface EnumTypeGlobal {
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
export type ContractType = ContractTypeNative | ContractTypeForeign;

/**
 * Type of a contract with full Solidity info -- may be used for actual variables
 *
 * @Category User-defined elemntary types
 */
export interface ContractTypeNative {
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
export interface ContractTypeForeign {
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

/**
 * Type of a user-defined value type
 *
 * These may be local (defined in a contract) or global (defined outside of any contract)
 *
 * @Category User-defined elementary types
 */
export type UserDefinedValueTypeType = UserDefinedValueTypeTypeLocal | UserDefinedValueTypeTypeGlobal;

/**
 * Local UDVT (defined in a contract)
 *
 * @Category User-defined elementary types
 */
export interface UserDefinedValueTypeTypeLocal {
  typeClass: "userDefinedValueType";
  kind: "local";
  /**
   * Internal ID.  Format may change in future.
   */
  id: string;
  typeName: string;
  definingContractName: string;
  definingContract?: ContractTypeNative;
  underlyingType?: BuiltInValueType;
}

/**
 * Global UDVT (defined outside a contract)
 *
 * @Category User-defined elementary types
 */
export interface UserDefinedValueTypeTypeGlobal {
  typeClass: "userDefinedValueType";
  kind: "global";
  /**
   * Internal ID.  Format may change in future.
   */
  id: string;
  typeName: string;
  underlyingType?: BuiltInValueType;
}

export type MagicVariableName = "message" | "block" | "transaction";

/**
 * Type of a magic variable
 *
 * @Category Special container types (debugger-only)
 */
export interface MagicType {
  typeClass: "magic";
  variable: MagicVariableName;
  //really, I could do this as a tagged union, but I don't see a reason to
  //introduce such complexity here, especially as this type is basically just
  //for the debugger
  memberTypes?: {
    [field: string]: Type;
  };
  //may have more optional fields defined in the future
}

/**
 * Type of a type!  This is currently only used for contract types and enum
 * types, but may expand in the future.
 * @Category Special container types (debugger-only)
 */
export type TypeType = TypeTypeContract | TypeTypeEnum;

/**
 * Type of a contract type
 * @Category Special container types (debugger-only)
 */
export interface TypeTypeContract {
  typeClass: "type";
  type: ContractTypeNative;
  /**
   * these must be in order, and must only include
   * **non-inherited** state variables
   */
  stateVariableTypes?: NameTypePair[];
}

/**
 * Type of an enum type
 * @Category Special container types (debugger-only)
 */
export interface TypeTypeEnum {
  typeClass: "type";
  type: EnumType;
}

/**
 * Fictitious type used for a transaction options argument
 * (e.g. value, from, etc).
 *
 * @Category Special types (encoder-only)
 */
export interface OptionsType {
  typeClass: "options";
}

/**
 * Reference types
 *
 * @Category General categories
 */
export type ReferenceType =
  | ArrayType
  | MappingType
  | StructType
  | StringType
  | BytesTypeDynamic;

export interface TypesById {
  [id: string]: UserDefinedType;
}

export interface TypesByCompilationAndId {
  [compilationId: string]: {
    compiler: CompilerVersion;
    types: TypesById;
  };
}

export function forgetCompilations(
  typesByCompilation: TypesByCompilationAndId
): TypesById {
  return Object.assign(
    {},
    ...Object.values(typesByCompilation).map(({ types }) => types)
  );
}

function isUserDefinedType(anyType: Type): anyType is UserDefinedType {
  const userDefinedTypes = ["contract", "enum", "struct", "userDefinedValueType"];
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
      break; //to satisfy TS :P
    case "userDefinedValueType":
      //differs from struct & enum in that typeClass is omitted
      switch (dataType.kind) {
        case "local":
          return `${dataType.definingContractName}.${dataType.typeName}`;
        case "global":
          return `${dataType.typeName}`;
      }
      break; //to satisfy TS :P
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
    case "type":
      return `type(${typeString(dataType.type)})`;
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
    case "options":
      //note: not a real Solidity type! just for error messaging!
      return "options";
  }
}

export function isContractDefinedType(
  anyType: Type
): anyType is ContractDefinedType {
  const contractDefinedTypes = ["enum", "struct", "userDefinedValueType"];
  return contractDefinedTypes.includes(anyType.typeClass)
    && (<EnumType|StructType|UserDefinedValueTypeType>anyType).kind === "local";
}

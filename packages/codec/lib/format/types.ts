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
import * as Ast from "../types/ast";

export namespace Types {

  export type Type = UintType | IntType | BoolType | BytesType | AddressType
    | FixedType | UfixedType | StringType | ArrayType | MappingType | FunctionType
    | StructType | EnumType | ContractType | MagicType | TupleType;

  export interface UintType {
    typeClass: "uint";
    bits: number;
    typeHint?: string;
  }

  export interface IntType {
    typeClass: "int";
    bits: number;
    typeHint?: string;
  }

  export interface BoolType {
    typeClass: "bool";
    typeHint?: string;
  }

  export type BytesType = BytesTypeStatic | BytesTypeDynamic;

  export interface BytesTypeStatic {
    typeClass: "bytes";
    kind: "static";
    length: number;
    typeHint?: string;
  }

  export interface BytesTypeDynamic {
    typeClass: "bytes";
    kind: "dynamic";
    location?: Ast.Location;
    typeHint?: string;
  }

  export type AddressType = AddressTypeSpecific | AddressTypeGeneral;

  export interface AddressTypeSpecific {
    typeClass: "address";
    kind: "specific";
    payable: boolean;
  }

  export interface AddressTypeGeneral {
    typeClass: "address";
    kind: "general";
    typeHint?: string;
  }

  export interface StringType {
    typeClass: "string";
    location?: Ast.Location;
    typeHint?: string;
  }

  export interface FixedType {
    typeClass: "fixed";
    bits: number;
    places: number;
    typeHint?: string;
  }

  export interface UfixedType {
    typeClass: "ufixed";
    bits: number;
    places: number;
    typeHint?: string;
  }

  export type ArrayType = ArrayTypeStatic | ArrayTypeDynamic;

  export interface ArrayTypeStatic {
    typeClass: "array";
    kind: "static";
    baseType: Type;
    length: BN;
    location?: Ast.Location;
    typeHint?: string;
  }

  export interface ArrayTypeDynamic {
    typeClass: "array";
    kind: "dynamic";
    baseType: Type;
    location?: Ast.Location;
    typeHint?: string;
  }

  export type ElementaryType = UintType | IntType | BoolType | BytesType | FixedType
    | UfixedType | AddressType | StringType;

  export interface MappingType {
    typeClass: "mapping";
    keyType: ElementaryType;
    valueType: Type;
    location?: "storage";
  }

  export type FunctionType = FunctionInternalType | FunctionExternalType;

  export interface FunctionInternalType {
    typeClass: "function";
    visibility: "internal";
    mutability: Ast.Mutability;
    inputParameterTypes: Type[];
    outputParameterTypes: Type[];
    //we do not presently support bound functions
  }

  export type FunctionExternalType = FunctionExternalTypeSpecific | FunctionExternalTypeGeneral;

  export interface FunctionExternalTypeSpecific {
    typeClass: "function";
    visibility: "external";
    kind: "specific";
    mutability: Ast.Mutability;
    inputParameterTypes: Type[];
    outputParameterTypes: Type[];
    //we do not presently support bound functions
  }

  export interface FunctionExternalTypeGeneral {
    typeClass: "function";
    visibility: "external";
    kind: "general";
    //we do not presently support bound functions
    typeHint?: string;
  }

  export type ContractDefinedType = StructTypeLocal | EnumTypeLocal;
  export type UserDefinedType = ContractDefinedType | ContractTypeNative | StructTypeGlobal | EnumTypeGlobal;

  export type StructType = StructTypeLocal | StructTypeGlobal;

  export interface NameTypePair {
    name: string;
    type: Type;
  }

  export interface StructTypeLocal {
    typeClass: "struct";
    kind: "local";
    id: string;
    typeName: string;
    definingContractName: string;
    definingContract?: ContractTypeNative;
    memberTypes?: NameTypePair[]; //these should be in order
    location?: Ast.Location;
  }

  export interface StructTypeGlobal {
    typeClass: "struct";
    kind: "global";
    id: string;
    typeName: string;
    memberTypes?: NameTypePair[]; //these should be in order
    location?: Ast.Location;
  }

  export interface OptionallyNamedType {
    name?: string;
    type: Type;
  }

  export interface TupleType {
    typeClass: "tuple";
    memberTypes: OptionallyNamedType[];
    typeHint?: string;
  }

  export type EnumType = EnumTypeLocal | EnumTypeGlobal;

  export interface EnumTypeLocal {
    typeClass: "enum";
    kind: "local";
    id: string;
    typeName: string;
    definingContractName: string;
    definingContract?: ContractTypeNative;
    options?: string[]; //these should be in order
  }

  export interface EnumTypeGlobal {
    typeClass: "enum";
    kind: "global";
    id: string;
    typeName: string;
    options?: string[]; //these should be in order
  }

  export type ContractType = ContractTypeNative | ContractTypeForeign;

  export interface ContractTypeNative {
    typeClass: "contract";
    kind: "native";
    id: string;
    typeName: string;
    contractKind?: Ast.ContractKind;
    payable?: boolean; //will be useful in the future
    //may have more optional members defined later, but I'll leave these out for
    //now
  }

  export interface ContractTypeForeign {
    typeClass: "contract";
    kind: "foreign";
    typeName: string;
    contractKind?: Ast.ContractKind;
    payable?: boolean; //will be useful in the future
    //may have more optional members defined later, but I'll leave these out for
    //now
  }

  export type MagicVariableName = "message" | "block" | "transaction";

  export interface MagicType {
    typeClass: "magic";
    variable: MagicVariableName;
    //really, I could do this as a tagged union, but I don't see a reason to
    //introduce such complexity here, especially as this type is basically just
    //for the debugger
    memberTypes?: {
      [field: string]: Type
    };
    //may have more optional fields defined in the future
  }

  export type ReferenceType = ArrayType | MappingType | StructType | StringType | BytesTypeDynamic;

  export interface TypesById {
    [id: string]: UserDefinedType;
  };

}

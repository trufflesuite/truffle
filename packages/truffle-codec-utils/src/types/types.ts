import debugModule from "debug";
const debug = debugModule("codec-utils:types:types");

//type objects for Solidity types
//these will just be defined as interfaces; there's not any particular need for
//classes here (at least for now)

//Note: This is NOT intended to represent every possible type representable by
//a Solidity type identifier!  Only possible types of variables, not of all
//possible values.  (Though there may be some expansion in the future; in
//particular, tuples will be added later.)
//We do however count the builtin variables msg, block, and tx as variables
//(not other builtins though for now) so there is some support for the magic
//type.

//We do include fixed and ufixed, even though these aren't implemented yet;
//note though that values.ts does not include these.
//Similarly with global structs and enums.
//Foreign contract types aren't really implemented yet either, although
//those aren't produced from definitions.
//(General external functions aren't really implemented yet either for the
//same reason.)

//NOTE: not all of these optional fields are actually implemented. Some are
//just intended for the future.
//ALSO NOTE: IDs are strings even though they're currently numeric because
//that might change in the future.

import BN from "bn.js";
import * as Ast from "../ast";
import { Definition as DefinitionUtils } from "../definition";
import { CompilerVersion } from "../compiler";

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

  export interface AddressType {
    typeClass: "address";
    payable: boolean;
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

  export interface MagicType {
    typeClass: "magic";
    variable: string; //not putting this in the type annotation for technical
    //reasons, but this should be one of "message", "block", or "transaction";
    //we do *not* presently support abi or meta_type
    memberTypes?: {
      [field: string]: Type
    };
  }

  export type ReferenceType = ArrayType | MappingType | StructType | StringType | BytesTypeDynamic;

  export interface TypesById {
    [id: string]: UserDefinedType;
  };

  //NOTE: the following function will *not* work for arbitrary nodes! It will,
  //however, work for the ones we need (i.e., variable definitions, and arbitrary
  //things of elementary type)
  //NOTE: set forceLocation to *null* to force no location. leave it undefined
  //to not force a location.
  //NOTE: set compiler to null to force addresses to *not* be payable (HACK)?
  export function definitionToType(definition: Ast.AstDefinition, compiler: CompilerVersion | null, forceLocation?: Ast.Location | null): Type {
    debug("definition %O", definition);
    let typeClass = DefinitionUtils.typeClass(definition);
    switch(typeClass) {
      case "bool":
        return {
          typeClass
        };
      case "address": {
        let payable = DefinitionUtils.isAddressPayable(definition, compiler);
        return {
          typeClass,
          payable
        }
      }
      case "uint": {
        let bytes = DefinitionUtils.specifiedSize(definition);
        return {
          typeClass,
          bits: bytes * 8
        };
      }
      case "int": { //typeScript won't let me group these for some reason
        let bytes = DefinitionUtils.specifiedSize(definition);
        return {
          typeClass,
          bits: bytes * 8
        };
      }
      case "fixed": { //typeScript won't let me group these for some reason
        let bytes = DefinitionUtils.specifiedSize(definition);
        let places = DefinitionUtils.decimalPlaces(definition);
        return {
          typeClass,
          bits: bytes * 8,
          places
        };
      }
      case "ufixed": {
        let bytes = DefinitionUtils.specifiedSize(definition);
        let places = DefinitionUtils.decimalPlaces(definition);
        return {
          typeClass,
          bits: bytes * 8,
          places
        };
      }
      case "string": {
        if(forceLocation === null) {
          return {
            typeClass
          };
        }
        let location = forceLocation || DefinitionUtils.referenceType(definition);
        return {
          typeClass,
          location
        };
      }
      case "bytes": {
        let length = DefinitionUtils.specifiedSize(definition);
        if(length !== null) {
          return {
            typeClass,
            kind: "static",
            length
          }
        } else {
          if(forceLocation === null) {
            return {
              typeClass,
              kind: "dynamic"
            };
          }
          let location = forceLocation || DefinitionUtils.referenceType(definition);
          return {
            typeClass,
            kind: "dynamic",
            location
          }
        }
      }
      case "array": {
        let baseDefinition = DefinitionUtils.baseDefinition(definition);
        let baseType = definitionToType(baseDefinition, compiler, forceLocation);
        let location = forceLocation || DefinitionUtils.referenceType(definition);
        if(DefinitionUtils.isDynamicArray(definition)) {
          if(forceLocation !== null) {
            return {
              typeClass,
              baseType,
              kind: "dynamic",
              location
            }
          }
          else {
            return {
              typeClass,
              baseType,
              kind: "dynamic"
            }
          }
        } else {
          let length = new BN(DefinitionUtils.staticLengthAsString(definition));
          if(forceLocation !== null) {
            return {
              typeClass,
              baseType,
              kind: "static",
              length,
              location
            }
          }
          else {
            return {
              typeClass,
              baseType,
              kind: "static",
              length
            }
          }
        }
      }
      case "mapping": {
        let keyDefinition = DefinitionUtils.keyDefinition(definition);
        //note that we can skip the scopes argument here! that's only needed when
        //a general node, rather than a declaration, is being passed in
        let keyType = <ElementaryType>definitionToType(keyDefinition, compiler, null);
        //suppress the location on the key type (it'll be given as memory but
        //this is meaningless)
        //also, we have to tell TypeScript ourselves that this will be an elementary
        //type; it has no way of knowing that
        let valueDefinition = definition.valueType || definition.typeName.valueType;
        let valueType = definitionToType(valueDefinition, compiler, forceLocation);
        if(forceLocation === null) {
          return {
            typeClass,
            keyType,
            valueType
          };
        }
        return {
          typeClass,
          keyType,
          valueType,
          location: "storage"
        };
      }
      case "function": {
        let visibility = DefinitionUtils.visibility(definition);
        let mutability = DefinitionUtils.mutability(definition);
        let [inputParameters, outputParameters] = DefinitionUtils.parameters(definition);
        //note: don't force a location on these! use the listed location!
        let inputParameterTypes = inputParameters.map(parameter => definitionToType(parameter, compiler));
        let outputParameterTypes = outputParameters.map(parameter => definitionToType(parameter, compiler));
        switch(visibility) {
          case "internal":
            return {
              typeClass,
              visibility,
              mutability,
              inputParameterTypes,
              outputParameterTypes
            };
          case "external":
            return {
              typeClass,
              visibility,
              kind: "specific",
              mutability,
              inputParameterTypes,
              outputParameterTypes
            };
        }
        break; //to satisfy typescript
      }
      case "struct": {
        let id = DefinitionUtils.typeId(definition).toString();
        let qualifiedName = definition.typeName
          ? definition.typeName.name
          : definition.name;
        let [definingContractName, typeName] = qualifiedName.split(".");
        if(forceLocation === null) {
          return {
            typeClass,
            kind: "local",
            id,
            typeName,
            definingContractName
          };
        }
        let location = forceLocation || DefinitionUtils.referenceType(definition);
        return {
          typeClass,
          kind: "local",
          id,
          typeName,
          definingContractName,
          location
        };
      }
      case "enum": {
        let id = DefinitionUtils.typeId(definition).toString();
        let qualifiedName = definition.typeName
          ? definition.typeName.name
          : definition.name;
        let [definingContractName, typeName] = qualifiedName.split(".");
        return {
          typeClass,
          kind: "local",
          id,
          typeName,
          definingContractName
        };
      }
      case "contract": {
        let id = DefinitionUtils.typeId(definition).toString();
        let typeName = definition.typeName
          ? definition.typeName.name
          : definition.name;
        let contractKind = DefinitionUtils.contractKind(definition);
        return {
          typeClass,
          kind: "native",
          id,
          typeName,
          contractKind
        }
      }
      case "magic": {
        let typeIdentifier = DefinitionUtils.typeIdentifier(definition);
        let variable = typeIdentifier.match(/^t_magic_(.*)$/)[1];
        return {
          typeClass,
          variable
        }
      }
    }
  }

  //whereas the above takes variable definitions, this takes the actual type
  //definition
  export function definitionToStoredType(definition: Ast.AstDefinition, compiler: CompilerVersion, referenceDeclarations?: Ast.AstReferences): UserDefinedType {
    switch(definition.nodeType) {
      case "StructDefinition": {
        let id = definition.id.toString();
        let [definingContractName, typeName] = definition.canonicalName.split(".");
        let memberTypes: {name: string, type: Type}[] = definition.members.map(
          member => ({name: member.name, type: definitionToType(member, compiler, null)})
        );
        let definingContract;
        if(referenceDeclarations) {
          let contractDefinition = Object.values(referenceDeclarations).find(
            node => node.nodeType === "ContractDefinition" &&
            node.nodes.some(
              (subNode: Ast.AstDefinition) => subNode.id.toString() === id
            )
          );
          definingContract = <ContractTypeNative> definitionToStoredType(contractDefinition, compiler); //can skip reference declarations
        }
        return {
          typeClass: "struct",
          kind: "local",
          id,
          typeName,
          definingContractName,
          definingContract,
          memberTypes
        };
      }
      case "EnumDefinition": {
        let id = definition.id.toString();
        let [definingContractName, typeName] = definition.canonicalName.split(".");
        let options = definition.members.map(member => member.name);
        let definingContract;
        if(referenceDeclarations) {
          let contractDefinition = Object.values(referenceDeclarations).find(
            node => node.nodeType === "ContractDefinition" &&
            node.nodes.some(
              (subNode: Ast.AstDefinition) => subNode.id.toString() === id
            )
          );
          definingContract = <ContractTypeNative> definitionToStoredType(contractDefinition, compiler); //can skip reference declarations
        }
        return {
          typeClass: "enum",
          kind: "local",
          id,
          typeName,
          definingContractName,
          definingContract,
          options
        };
      }
      case "ContractDefinition": {
        let id = definition.id.toString();
        let typeName = definition.name;
        let contractKind = definition.contractKind;
        let payable = DefinitionUtils.isContractPayable(definition);
        return {
          typeClass: "contract",
          kind: "native",
          id,
          typeName,
          contractKind,
          payable
        };
      }
    }
  }

  //one could define a counterpart function that stripped all unnecessary information
  //from the type object, but at the moment I see no need for that
  export function fullType(basicType: Type, userDefinedTypes: TypesById): Type {
    if(!isUserDefinedType(basicType)) {
      return basicType;
    }
    let id = basicType.id;
    let storedType = userDefinedTypes[id];
    if(!storedType) {
      return basicType;
    }
    let returnType: Type = { ...basicType, ...storedType };
    if(isReferenceType(basicType) && basicType.location !== undefined) {
      returnType = specifyLocation(returnType, basicType.location);
    }
    return returnType;
  }

  export function isContractDefinedType(anyType: Type): anyType is ContractDefinedType {
    const contractDefinedTypes = ["enum", "struct"];
    return contractDefinedTypes.includes(anyType.typeClass);
  }

  export function isUserDefinedType(anyType: Type): anyType is UserDefinedType {
    const userDefinedTypes = ["contract", "enum", "struct"];
    return userDefinedTypes.includes(anyType.typeClass);
  }

  export function isReferenceType(anyType: Type): anyType is ReferenceType {
    const alwaysReferenceTypes = ["array", "mapping", "struct", "string"];
    if(alwaysReferenceTypes.includes(anyType.typeClass)) {
      return true;
    }
    else if(anyType.typeClass === "bytes") {
      return anyType.kind === "dynamic";
    }
    else {
      return false;
    }
  }

  //the location argument here always forces, so passing undefined *will* force undefined
  export function specifyLocation(dataType: Type, location: Ast.Location | undefined): Type {
    if(isReferenceType(dataType)) {
      switch(dataType.typeClass) {
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
          let newLocation = location === "storage" ? "storage" as "storage" : undefined;
          return {
            ...dataType,
            location: newLocation,
            valueType: specifyLocation(dataType.valueType, newLocation)
          };
        case "struct":
          let returnType = { ...dataType, location };
          if(returnType.memberTypes) {
            returnType.memberTypes = returnType.memberTypes.map(
              ({name: memberName, type: memberType}) => ({name: memberName, type: specifyLocation(memberType, location)})
            );
          }
          return returnType;
      }
    }
    else {
      return dataType;
    }
  }

}

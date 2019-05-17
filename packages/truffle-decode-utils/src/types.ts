import debugModule from "debug";
const debug = debugModule("decode-utils:types");

//type objects for Solidity types
//these will just be defined as interfaces; there's not any particular need for
//classes here (at least for now)

//Note: This is NOT intended to represent every possible type representable by
//a Solidity type identifier!  Only possible types of variables, not of all
//possible values.  (Though there may be some expansion in the future.)
//We do however count the builtin variables msg, block, and tx as variables
//(not other builtins though for now) so there is some support for the magic
//type.

//We do include fixed and ufixed, even though these aren't implemented yet;
//note though that values.ts does not include these.

//NOTE: not all of these optional fields are actually implemented. Some are
//just intended for the future.

import BN from "bn.js";
import { AstDefinition } from "./ast.ts";
import DefinitionUtils from "./definition.ts";

type Type = UintType | IntType | BoolType | BytesType | AddressType | FixedType
  | UfixedType | StringType | ArrayType | MappingType | FunctionType
  | StructType | EnumType | ContractType | MagicType;

interface UintType {
  typeclass: "uint";
  bits: number;
}

interface IntType {
  typeclass: "int";
  bits: number;
}

interface BoolType {
  typeClass: "bool";
}

type BytesType = BytesTypeStatic | BytesTypeDynamic;

interface BytesTypeStatic {
  typeClass: "bytes";
  kind: "static";
  length: number;
}

interface BytesTypeDynamic {
  typeClass: "bytes";
  kind: "dynamic";
  location?: string;
}

interface AddressType {
  typeClass: "address";
  payable: boolean;
}

interface StringType {
  typeClass: "string";
  location?: string;
}

interface FixedType {
  typeClass: "fixed";
  bits: number;
  places: number;
}

interface UfixedType {
  typeClass: "ufixed";
  bits: number;
  places: number;
}

type ArrayType = ArrayTypeStatic | ArrayTypeDynamic;

interface ArrayTypeStatic {
  typeClass: "array";
  baseType: Type;
  kind: "static";
  length: BN;
  location?: string;
}

interface ArrayTypeDynamic {
  typeClass: "array";
  baseType: Type;
  kind: "dynamic";
  location?: string;
}

type ElementaryType = UintType | IntType | BoolType | BytesType | FixedType
  | UfixedType | AddressType | StringType;

interface MappingType {
  typeClass: "mapping";
  keyType: ElementaryType;
  valueType: Type;
  location?: string; //should only ever be storage
}

interface FunctionType {
  typeClass: "function";
  visibility: string; //should be "internal" or "external", not weird
  //solidity-internal visibilities (but for technical reasons I'm not
  //putting that in the type requirements)
  mutability: string; //similarly, should be "nonpayable", "pure", "view",
  //or "payable"
  inputParameterTypes: Type[];
  outputParameterTypes: Type[];
  //we do not presently support bound functions
}

type ContractDefinedType = StructType | EnumType;
type UserDefinedType = DefinedInContractType | ContractType;

interface StructType {
  typeClass: "struct";
  id: number;
  typeName: string;
  definingContractName: string;
  definingContract?: ContractType;
  memberTypes?: {
    [field: string]: Type
  };
  location?: string;
}

interface EnumType {
  typeClass: "enum";
  id: number;
  typeName: string;
  definingContractName: string;
  definingContract?: ContractType;
  options?: string[]; //these should be in order
}

interface ContractType {
  typeClass: "contract";
  id: number;
  typeName: string;
  contractKind?: string;
  payable?: boolean; //will be useful in the future
  //may have more optional members defined later, but I'll leave these out for
  //now
}

interface MagicType {
  typeClass: "magic";
  variable: string; //not putting this in the type annotation for technical
  //reasons, but this should be one of "message", "block", or "transaction";
  //we do *not* presently support abi or meta_type
  memberTypes?: {
    [field: string]: Type
  };
}

type ReferenceType = ArrayType | MappingType | StructType | StringType | BytesTypeDynamic;

interface TypesById {
  [id: number]: UserDefinedType;
};

//NOTE: the following function will *not* work for arbitrary nodes! It will,
//however, work for the ones we need (i.e., variable definitions, and arbitrary
//things of elementary type)
//NOTE: set forceLocation to *null* to force no location. leave it undefined
//to not force a location.
function definitionToType(definition: AstDefinition, forceLocation?: string | null): Type {
  let typeClass = DefinitionUtils.typeClass(definition);
  switch(typeClass) {
    case "bool":
      return {
        typeClass
      };
    case "address": {
      let payable = DefinitionUtils.isAddressPayable(definition);
      return {
        typeClass,
        payable
      }
    }
    case "uint": //deliberate grouping
    case "int": {
      let bytes = DefinitionUtils.specifiedSize(definition);
      return {
        typeClass,
        bits: bytes * 8
      };
    }
    case "fixed": //deliberate grouping
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
          dynamic: false,
          length
        }
      } else {
        if(forceLocation === null) {
          return {
            typeClass,
            dynamic: true
          };
        }
        let location = forceLocation || DefinitionUtils.referenceType(definition);
        return {
          typeClass,
          dynamic: true,
          location
        }
      }
    }
    case "array": {
      let returnType = { typeClass };
      let baseDefinition = DefinitionUtils.baseDefinition(definition);
      returnType.baseType = definitionToType(baseDefinition, forceLocation);
      if(DefinitionUtils.isDynamicArray(definition)) {
        returnType.dynamic = true;
      } else {
        returnType.dynamic = false;
        returnType.length = new BN(DefinitionUtils.staticLengthAsString(definition));
      }
      if(!suppressLocation) {
        returnType.location = DefinitionUtils.referenceType(definition);
      }
      return returnType;
    }
    case "mapping": {
      let keyDefinition = DefinitionUtils.keyDefinition(definition);
      //note that we can skip the scopes argument here! that's only needed when
      //a general node, rather than a declaration, is being passed in
      let keyType = definitionToType(keyDefinition, null);
      //suppress the location on the key type (it'll be given as memory but
      //this is meaningless)
      let valueDefinition = definition.valueType || definition.typeName.valueType;
      let valueType = definitionToType(valueType, forceLocation);
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
      let mutability = definition.stateMutability || definition.typeName.stateMutability;
      let [inputParameters, outputParameters] = DefinitionUtils.parameters(definition);
      let inputParamterTypes = inputParameters.map(definitionToType);
      let outputParamterTypes = outputParameters.map(definitionToType);
      return {
        typeClass,
        visibility,
        mutability,
        inputParameterTypes,
        outputParameterTypes
      }
    }
    case "struct": {
      let id = DefinitionUtils.typeId(definition);
      let qualifiedName = definition.typeName
        ? definition.typeName.name
        : definition.name;
      let [definingContractName, typeName] = qualifiedName.split(".");
      if(forceLocation === null) {
        return {
          typeClass,
          id,
          typeName,
          definingContractName
        };
      }
      let location = forceLocation || DefinitionUtils.referenceType(definition);
      return {
        typeClass,
        id,
        typeName,
        definingContractName,
        location
      };
    }
    case "enum": {
      let id = DefinitionUtils.typeId(definition);
      let qualifiedName = definition.typeName
        ? definition.typeName.name
        : definition.name;
      let [definingContractName, typeName] = qualifiedName.split(".");
      return {
        typeClass,
        id,
        typeName,
        definingContractName
      };
    }
    case "contract": {
      let id = DefinitionUtils.typeId(definition);
      let typeName = definition.typeName
        ? definition.typeName.name
        : definition.name;
      let contractKind = definitionUtils.contractKind(definition);
      return {
        typeClass,
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
function definitionToStoredType(definition: AstDefinition): Type {
  switch(definition.nodeType) {
    case "StructDefinition": {
      let id = definition.id;
      let [definingContractName, typeName] = definition.canonicalName.split(".");
      let memberTypes = definition.members.map(definitionToType, null);
      return {
        typeClass: "struct",
        id,
        typeName,
        definingContractName
        memberTypes
      };
    }
    case "EnumDefinition": {
      let id = definition.id;
      let [definingContractName, typeName] = definition.canonicalName.split(".");
      let options = definition.members.map(member => member.name);
      return {
        typeClass: "enum",
        id,
        typeName,
        definingContractName,
        options
      };
    }
    case "ContractDefinition": {
      let id = definition.id;
      let typeName = definition.name;
      let contractKind = definition.contractKind;
      let payable = DefinitionUtils.isContractPayable(definition);
      return {
        typeClass: "contract",
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
function fullType(basicType: Type, userDefinedTypes: TypesById): Type {
  if(!isUserDefinedType(basicType)) {
    return basicType;
  }
  let id = basicType.id;
  let storedType = userDefinedTypes[id];
  if(!storedType) {
    return basicType;
  }
  let returnType = { ...basicType, ...storedType };
  if(isReferenceType(basicType) && basicType.location !== undefined) {
    returnType = specifyLocation(returnType, basicType.location);
  }
  if(isContractDefinedType(returnType)) {
    returnType.definingContract = Object.values(userDefinedTypes).find(
      referenceType => referenceType.typeClass === "contract"
        && referenceType.typeName === returnType.typeName
    );
  }
  return returnType;
}

function isUserDefinedType(anyType: Type): boolean {
  const userDefinedTypes = ["contract", "enum", "struct"];
  return userDefinedTypes.includes(anyType.typeClass);
}

function isContractDefinedType(anyType: Type): boolean {
  const contractDefinedTypes = ["enum", "struct"];
  return contractDefinedTypes.includes(anyType.typeClass);
}

function isReferenceType(anyType: Type): boolean {
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
function specifyLocation(dataType: Type, location?: string) {
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
        return {
          ...dataType,
          location,
          valueType: specifyLocation(dataType.valueType, location)
        };
      case "struct":
        let returnType = { ...dataType, location };
        if(returnType.memberTypes) {
          for(let name in returnType.memberTypes) {
            returnType.memberTypes[name] = specifyLocation(returnType.memberTypes[name], location);
          }
        }
        return returnType;
    }
  }
  else {
    return dataType;
  }
}

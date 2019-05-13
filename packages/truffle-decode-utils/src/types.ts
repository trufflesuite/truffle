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

interface Type {
  //maybe put stuff about language and version here in the future??
}

interface UintType extends Type {
  typeclass: "uint";
  bits: number;
}

interface IntType extends Type {
  typeclass: "int";
  bits: number;
}

interface BoolType extends Type {
  typeClass: "bool";
}

type BytesType = BytesTypeStatic | BytesTypeDynamic;

interface BytesTypeStatic extends Type {
  typeClass: "bytes";
  dynamic: false;
  length: number;
}

interface BytesTypeDynamic extends Type {
  typeClass: "bytes";
  dynamic: true;
  location?: string;
}

interface AddressType extends Type {
  typeClass: "address";
  payable: boolean;
}

interface StringType extends Type {
  typeClass: "string";
  location?: string;
}

interface FixedType extends Type {
  typeClass: "fixed";
  bits: number;
  places: number;
}

interface UfixedType extends Type {
  typeClass: "ufixed";
  bits: number;
  places: number;
}

type ArrayType = ArrayTypeStatic | ArrayTypeDynamic;

interface ArrayTypeStatic extends Type {
  typeClass: "array";
  baseType: Type;
  dynamic: false;
  length: BN;
  location?: string;
}

interface ArrayTypeDynamic extends Type {
  typeClass: "array";
  baseType: Type;
  dynamic: true;
  location?: string;
}

type ElementaryType = UintType | IntType | BoolType | BytesType | FixedType
  | UfixedType | AddressType | StringType;

interface MappingType extends Type {
  typeClass: "mapping";
  keyType: ElementaryType;
  valueType: Type;
  location?: "storage";
}

interface FunctionType extends Type {
  typeClass: "function";
  visibility: string;
  mutability: string;
  inputParameterTypes: Type[];
  outputParameterTypes: Type[];
  //we do not presently support bound functions
}

type ContractDefinedType = StructType | EnumType;
type UserDefinedType = DefinedInContractType | ContractType;

interface StructType extends Type {
  typeClass: "struct";
  id: number;
  typeName: string;
  definingContract: string;
  definingContractType?: ContractType;
  memberTypes?: {
    [field: string]: Type
  };
  location?: string;
}

interface EnumType extends Type {
  typeClass: "enum";
  id: number;
  typeName: string;
  definingContract: string;
  definingContractType?: ContractType;
  options?: string[]; //these should be in order
}

interface ContractType extends Type {
  typeClass: "contract";
  id: number;
  typeName: string;
  contractKind?: string;
  payable?: boolean; //will be useful in the future
  //may have more optional members defined later, but I'll leave these out for
  //now
}

interface MagicType extends Type {
  typeClass: "magic";
  variable: string; //not putting this in the type annotation for technical
  //reasons, but this should be one of "message", "block", or "transaction";
  //we do *not* presently support abi or meta_type
}

type ReferenceType = ArrayType | MappingType | StructType | StringType | BytesTypeDynamic;

interface TypesById {
  [id: number]: UserDefinedType;
};

//NOTE: the following function will *not* work for arbitrary nodes! It will,
//however, work for the ones we need (i.e., variable definitions, and arbitrary
//things of elementary type)
function definitionToType(definition: AstDefinition, suppressLocation: boolean = false): Type {
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
      if(suppressLocation) {
        return {
          typeClass
        };
      }
      let location = DefinitionUtils.referenceType(definition);
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
        if(suppressLocation) {
          return {
            typeClass,
            dynamic: true
          };
        }
        let location = DefinitionUtils.referenceType(definition);
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
      returnType.baseType = definitionToType(baseDefinition);
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
      let keyType = definitionToType(keyDefinition, true);
      //suppress the location on the key type (it'll be given as memory but
      //this is meaningless)
      let valueDefinition = definition.valueType || definition.typeName.valueType;
      let valueType = definitionToType(valueType);
      if(suppressLocation) {
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
      let [definingContract, typeName] = qualifiedName.split(".");
      if(suppressLocation) {
        return {
          typeClass,
          id,
          typeName,
          definingContract
        };
      }
      let location = DefinitionUtils.referenceType(definition);
      return {
        typeClass,
        id,
        typeName,
        definingContract,
        location
      };
    }
    case "enum": {
      let id = DefinitionUtils.typeId(definition);
      let qualifiedName = definition.typeName
        ? definition.typeName.name
        : definition.name;
      let [definingContract, typeName] = qualifiedName.split(".");
      return {
        typeClass,
        id,
        typeName,
        definingContract
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
    default:
      debug("unrecognized type!");
  }
}

//whereas the above takes variable definitions, this takes the actual type
//definition
function definitionToReferenceType(definition: AstDefinition): Type {
  switch(definition.nodeType) {
    case "StructDefinition": {
      let id = definition.id;
      let [definingContract, typeName] = definition.canonicalName.split(".");
      let memberTypes = definition.members.map(definitionToType, true);
      return {
        typeClass: "struct",
        id,
        typeName,
        definingContract
        memberTypes
      };
    }
    case "EnumDefinition": {
      let id = definition.id;
      let [definingContract, typeName] = definition.canonicalName.split(".");
      let options = definition.members.map(member => member.name);
      return {
        typeClass: "enum",
        id,
        typeName,
        definingContract,
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
    default:
      debug("unrecognized reference type!");
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
  let returnType = { ...storedType };
  if((<ReferenceType>basicType).location !== undefined) {
    returnType.location = basicType.location;
  }
  if(isContractDefinedType(returnType)) {
    returnType.definingContractType = Object.values(userDefinedTypes).find(
      referenceType => referenceType.typeClass === "contract"
        && referenceType.typeName === returnType.typeName
    );
  }
  return returnType;
}

function isUserDefinedType(anyType: Type): anyType is UserDefinedType {
  const userDefinedTypes = ["contract", "enum", "struct"];
  return userDefinedTypes.includes(anyType.typeClass);
}

function isContractDefinedType(anyType: Type): anyType is ContractDefinedType {
  const contractDefinedTypes = ["enum", "struct"];
  return contractDefinedTypes.includes(anyType.typeClass);
}

function isReferenceType(anyType: Type): anyType is ReferenceType {
  const alwaysReferenceTypes = ["array", "mapping", "struct", "string"];
  if(alwaysReferenceTypes.includes(anyType.typeClass)) {
    return true;
  }
  else if(isBytesType(anyType)) {
    return anyType.dynamic;
  } else {
    return false;
  }
}

function isBytesType(anyType: Type) anyType is BytesType {
  return anyType.typeClass === "bytes";
}

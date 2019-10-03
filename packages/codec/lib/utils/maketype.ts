import debugModule from "debug";
const debug = debugModule("codec:format:maketype");

import BN from "bn.js";
import * as Ast from "../types/ast";
import { Definition as DefinitionUtils } from "./definition";
import { CompilerVersion } from "../types/compiler";
import { solidityFamily } from "./compiler";
import { AbiParameter } from "../types/abi";
import { Types } from "../format/types";
import { TypeUtils } from "./datatype";

export namespace MakeType {

  //NOTE: the following function will *not* work for arbitrary nodes! It will,
  //however, work for the ones we need (i.e., variable definitions, and arbitrary
  //things of elementary type)
  //NOTE: set forceLocation to *null* to force no location. leave it undefined
  //to not force a location.
  export function definitionToType(definition: Ast.AstDefinition, compiler: CompilerVersion, forceLocation?: Ast.Location | null): Types.Type {
    debug("definition %O", definition);
    let typeClass = DefinitionUtils.typeClass(definition);
    let typeHint = DefinitionUtils.typeStringWithoutLocation(definition);
    switch(typeClass) {
      case "bool":
        return {
          typeClass,
          typeHint
        };
      case "address": {
        switch(solidityFamily(compiler)) {
          case "pre-0.5.0":
            return {
              typeClass,
              kind: "general",
              typeHint
            };
          case "0.5.x":
            return {
              typeClass,
              kind: "specific",
              payable: DefinitionUtils.typeIdentifier(definition) === "t_address_payable"
            };
        }
        break; //to satisfy typescript
      }
      case "uint": {
        let bytes = DefinitionUtils.specifiedSize(definition);
        return {
          typeClass,
          bits: bytes * 8,
          typeHint
        };
      }
      case "int": { //typeScript won't let me group these for some reason
        let bytes = DefinitionUtils.specifiedSize(definition);
        return {
          typeClass,
          bits: bytes * 8,
          typeHint
        };
      }
      case "fixed": { //typeScript won't let me group these for some reason
        let bytes = DefinitionUtils.specifiedSize(definition);
        let places = DefinitionUtils.decimalPlaces(definition);
        return {
          typeClass,
          bits: bytes * 8,
          places,
          typeHint
        };
      }
      case "ufixed": {
        let bytes = DefinitionUtils.specifiedSize(definition);
        let places = DefinitionUtils.decimalPlaces(definition);
        return {
          typeClass,
          bits: bytes * 8,
          places,
          typeHint
        };
      }
      case "string": {
        if(forceLocation === null) {
          return {
            typeClass,
            typeHint
          };
        }
        let location = forceLocation || DefinitionUtils.referenceType(definition);
        return {
          typeClass,
          location,
          typeHint
        };
      }
      case "bytes": {
        let length = DefinitionUtils.specifiedSize(definition);
        if(length !== null) {
          return {
            typeClass,
            kind: "static",
            length,
            typeHint
          }
        } else {
          if(forceLocation === null) {
            return {
              typeClass,
              kind: "dynamic",
              typeHint
            };
          }
          let location = forceLocation || DefinitionUtils.referenceType(definition);
          return {
            typeClass,
            kind: "dynamic",
            location,
            typeHint
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
              location,
              typeHint
            }
          }
          else {
            return {
              typeClass,
              baseType,
              kind: "dynamic",
              typeHint
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
              location,
              typeHint
            }
          }
          else {
            return {
              typeClass,
              baseType,
              kind: "static",
              length,
              typeHint
            }
          }
        }
      }
      case "mapping": {
        let keyDefinition = DefinitionUtils.keyDefinition(definition);
        //note that we can skip the scopes argument here! that's only needed when
        //a general node, rather than a declaration, is being passed in
        let keyType = <Types.ElementaryType>definitionToType(keyDefinition, compiler, null);
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
        let qualifiedName = DefinitionUtils.typeStringWithoutLocation(definition).match(/struct (.*)/)[1];
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
        let qualifiedName = DefinitionUtils.typeStringWithoutLocation(definition).match(/enum (.*)/)[1];
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
        let variable = <Types.MagicVariableName> typeIdentifier.match(/^t_magic_(.*)$/)[1];
        return {
          typeClass,
          variable
        }
      }
    }
  }

  //whereas the above takes variable definitions, this takes the actual type
  //definition
  export function definitionToStoredType(definition: Ast.AstDefinition, compiler: CompilerVersion, referenceDeclarations?: Ast.AstReferences): Types.UserDefinedType {
    switch(definition.nodeType) {
      case "StructDefinition": {
        let id = definition.id.toString();
        let [definingContractName, typeName] = definition.canonicalName.split(".");
        let memberTypes: {name: string, type: Types.Type}[] = definition.members.map(
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
          definingContract = <Types.ContractTypeNative> definitionToStoredType(contractDefinition, compiler); //can skip reference declarations
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
          definingContract = <Types.ContractTypeNative> definitionToStoredType(contractDefinition, compiler); //can skip reference declarations
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

  export function abiParameterToType(abi: AbiParameter): Types.Type {
    let typeName = abi.type;
    let typeHint = abi.internalType;
    //first: is it an array?
    let arrayMatch = typeName.match(/(.*)\[(\d*)\]$/);
    if(arrayMatch) {
      let baseTypeName = arrayMatch[1];
      let lengthAsString = arrayMatch[2]; //may be empty!
      let baseAbi = {...abi, type: baseTypeName};
      let baseType = abiParameterToType(baseAbi);
      if(lengthAsString === "") {
        return {
          typeClass: "array",
          kind: "dynamic",
          baseType,
          typeHint
        }
      }
      else {
        let length = new BN(lengthAsString);
        return {
          typeClass: "array",
          kind: "static",
          length,
          baseType,
          typeHint
        }
      }
    }
    //otherwise, here are the simple cases
    let typeClass = typeName.match(/^([^0-9]+)/)[1];
    switch(typeClass) {
      case "uint":
      case "int": {
          let bits = typeName.match(/^u?int([0-9]+)/)[1];
          return {
            typeClass,
            bits: parseInt(bits),
            typeHint
          };
      }
      case "bytes":
        let length = typeName.match(/^bytes([0-9]*)/)[1];
        if(length === "") {
          return {
            typeClass,
            kind: "dynamic",
            typeHint
          };
        }
        else {
          return {
            typeClass,
            kind: "static",
            length: parseInt(length),
            typeHint
          };
        }
      case "address":
        return {
          typeClass,
          kind: "general",
          typeHint
        };
      case "string":
      case "bool":
        return {
          typeClass,
          typeHint
        };
      case "fixed":
      case "ufixed": {
          let [_, bits, places] = typeName.match(/^u?fixed([0-9]+)x([0-9]+)/);
          return {
            typeClass,
            bits: parseInt(bits),
            places: parseInt(places),
            typeHint
          };
      }
      case "function":
        return {
          typeClass,
          visibility: "external",
          kind: "general",
          typeHint
        }
      case "tuple":
        let memberTypes = abi.components.map(
          component => ({
            name: component.name || undefined, //leave undefined if component.name is empty string
            type: abiParameterToType(component)
          })
        );
        return {
          typeClass,
          memberTypes,
          typeHint
        };
    }
  }

}

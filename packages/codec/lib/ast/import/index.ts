import debugModule from "debug";
const debug = debugModule("codec:ast:convert");

import BN from "bn.js";
import * as Format from "@truffle/codec/format/common";
import * as Common from "@truffle/codec/common";
import * as Compiler from "@truffle/codec/compiler";
import * as Utils from "@truffle/codec/ast/utils";
import { AstNode, AstNodes } from "@truffle/codec/ast/types";

//NOTE: the following function will *not* work for arbitrary nodes! It will,
//however, work for the ones we need (i.e., variable definitions, and arbitrary
//things of elementary type)
//NOTE: set forceLocation to *null* to force no location. leave it undefined
//to not force a location.
export function definitionToType(
  definition: AstNode,
  compiler: Compiler.CompilerVersion,
  forceLocation?: Common.Location | null
): Format.Types.Type {
  debug("definition %O", definition);
  let typeClass = Utils.typeClass(definition);
  let typeHint = Utils.typeStringWithoutLocation(definition);
  switch (typeClass) {
    case "bool":
      return {
        typeClass,
        typeHint
      };
    case "address": {
      switch (Compiler.Utils.solidityFamily(compiler)) {
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
            payable: Utils.typeIdentifier(definition) === "t_address_payable"
          };
      }
      break; //to satisfy typescript
    }
    case "uint": {
      let bytes = Utils.specifiedSize(definition);
      return {
        typeClass,
        bits: bytes * 8,
        typeHint
      };
    }
    case "int": {
      //typeScript won't let me group these for some reason
      let bytes = Utils.specifiedSize(definition);
      return {
        typeClass,
        bits: bytes * 8,
        typeHint
      };
    }
    case "fixed": {
      //typeScript won't let me group these for some reason
      let bytes = Utils.specifiedSize(definition);
      let places = Utils.decimalPlaces(definition);
      return {
        typeClass,
        bits: bytes * 8,
        places,
        typeHint
      };
    }
    case "ufixed": {
      let bytes = Utils.specifiedSize(definition);
      let places = Utils.decimalPlaces(definition);
      return {
        typeClass,
        bits: bytes * 8,
        places,
        typeHint
      };
    }
    case "string": {
      if (forceLocation === null) {
        return {
          typeClass,
          typeHint
        };
      }
      let location = forceLocation || Utils.referenceType(definition);
      return {
        typeClass,
        location,
        typeHint
      };
    }
    case "bytes": {
      let length = Utils.specifiedSize(definition);
      if (length !== null) {
        return {
          typeClass,
          kind: "static",
          length,
          typeHint
        };
      } else {
        if (forceLocation === null) {
          return {
            typeClass,
            kind: "dynamic",
            typeHint
          };
        }
        let location = forceLocation || Utils.referenceType(definition);
        return {
          typeClass,
          kind: "dynamic",
          location,
          typeHint
        };
      }
    }
    case "array": {
      let baseDefinition = Utils.baseDefinition(definition);
      let baseType = definitionToType(baseDefinition, compiler, forceLocation);
      let location = forceLocation || Utils.referenceType(definition);
      if (Utils.isDynamicArray(definition)) {
        if (forceLocation !== null) {
          return {
            typeClass,
            baseType,
            kind: "dynamic",
            location,
            typeHint
          };
        } else {
          return {
            typeClass,
            baseType,
            kind: "dynamic",
            typeHint
          };
        }
      } else {
        let length = new BN(Utils.staticLengthAsString(definition));
        if (forceLocation !== null) {
          return {
            typeClass,
            baseType,
            kind: "static",
            length,
            location,
            typeHint
          };
        } else {
          return {
            typeClass,
            baseType,
            kind: "static",
            length,
            typeHint
          };
        }
      }
    }
    case "mapping": {
      let keyDefinition = Utils.keyDefinition(definition);
      //note that we can skip the scopes argument here! that's only needed when
      //a general node, rather than a declaration, is being passed in
      let keyType = <Format.Types.ElementaryType>(
        definitionToType(keyDefinition, compiler, null)
      );
      //suppress the location on the key type (it'll be given as memory but
      //this is meaningless)
      //also, we have to tell TypeScript ourselves that this will be an elementary
      //type; it has no way of knowing that
      let valueDefinition =
        definition.valueType || definition.typeName.valueType;
      let valueType = definitionToType(
        valueDefinition,
        compiler,
        forceLocation
      );
      if (forceLocation === null) {
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
      let visibility = Utils.visibility(definition);
      let mutability = Utils.mutability(definition);
      let [inputParameters, outputParameters] = Utils.parameters(definition);
      //note: don't force a location on these! use the listed location!
      let inputParameterTypes = inputParameters.map(parameter =>
        definitionToType(parameter, compiler)
      );
      let outputParameterTypes = outputParameters.map(parameter =>
        definitionToType(parameter, compiler)
      );
      switch (visibility) {
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
      let id = Utils.typeId(definition).toString();
      let qualifiedName = Utils.typeStringWithoutLocation(definition).match(
        /struct (.*)/
      )[1];
      let definingContractName: string;
      let typeName: string;
      if (qualifiedName.includes(".")) {
        [definingContractName, typeName] = qualifiedName.split(".");
      } else {
        typeName = qualifiedName;
        //leave definingContractName undefined
      }
      if (forceLocation === null) {
        if (definingContractName) {
          return {
            typeClass,
            kind: "local",
            id,
            typeName,
            definingContractName
          };
        } else {
          return {
            typeClass,
            kind: "global",
            id,
            typeName
          };
        }
      }
      let location = forceLocation || Utils.referenceType(definition);
      if (definingContractName) {
        return {
          typeClass,
          kind: "local",
          id,
          typeName,
          definingContractName,
          location
        };
      } else {
        return {
          typeClass,
          kind: "global",
          id,
          typeName,
          location
        };
      }
    }
    case "enum": {
      let id = Utils.typeId(definition).toString();
      let qualifiedName = Utils.typeStringWithoutLocation(definition).match(
        /enum (.*)/
      )[1];
      let definingContractName: string;
      let typeName: string;
      if (qualifiedName.includes(".")) {
        [definingContractName, typeName] = qualifiedName.split(".");
      } else {
        typeName = qualifiedName;
        //leave definingContractName undefined
      }
      if (definingContractName) {
        return {
          typeClass,
          kind: "local",
          id,
          typeName,
          definingContractName
        };
      } else {
        return {
          typeClass,
          kind: "global",
          id,
          typeName
        };
      }
    }
    case "contract": {
      let id = Utils.typeId(definition).toString();
      let typeName = definition.typeName
        ? definition.typeName.name
        : definition.name;
      let contractKind = Utils.contractKind(definition);
      return {
        typeClass,
        kind: "native",
        id,
        typeName,
        contractKind
      };
    }
    case "magic": {
      let typeIdentifier = Utils.typeIdentifier(definition);
      let variable = <Format.Types.MagicVariableName>(
        typeIdentifier.match(/^t_magic_(.*)$/)[1]
      );
      return {
        typeClass,
        variable
      };
    }
  }
}

//whereas the above takes variable definitions, this takes the actual type
//definition
export function definitionToStoredType(
  definition: AstNode,
  compiler: Compiler.CompilerVersion,
  referenceDeclarations?: AstNodes
): Format.Types.UserDefinedType {
  switch (definition.nodeType) {
    case "StructDefinition": {
      let id = definition.id.toString();
      let definingContractName: string;
      let typeName: string;
      if (definition.canonicalName.includes(".")) {
        [definingContractName, typeName] = definition.canonicalName.split(".");
      } else {
        typeName = definition.canonicalName;
        //leave definingContractName undefined
      }
      let memberTypes: {
        name: string;
        type: Format.Types.Type;
      }[] = definition.members.map(member => ({
        name: member.name,
        type: definitionToType(member, compiler, null)
      }));
      let definingContract;
      if (referenceDeclarations) {
        let contractDefinition = Object.values(referenceDeclarations).find(
          node =>
            node.nodeType === "ContractDefinition" &&
            node.nodes.some((subNode: AstNode) => subNode.id.toString() === id)
        );
        if (contractDefinition) {
          definingContract = <Format.Types.ContractTypeNative>(
            definitionToStoredType(contractDefinition, compiler)
          ); //can skip reference declarations
        }
      }
      if (definingContract) {
        return {
          typeClass: "struct",
          kind: "local",
          id,
          typeName,
          definingContractName,
          definingContract,
          memberTypes
        };
      } else {
        return {
          typeClass: "struct",
          kind: "global",
          id,
          typeName,
          memberTypes
        };
      }
    }
    case "EnumDefinition": {
      let id = definition.id.toString();
      let definingContractName: string;
      let typeName: string;
      if (definition.canonicalName.includes(".")) {
        [definingContractName, typeName] = definition.canonicalName.split(".");
      } else {
        typeName = definition.canonicalName;
        //leave definingContractName undefined
      }
      let options = definition.members.map(member => member.name);
      let definingContract;
      if (referenceDeclarations) {
        let contractDefinition = Object.values(referenceDeclarations).find(
          node =>
            node.nodeType === "ContractDefinition" &&
            node.nodes.some((subNode: AstNode) => subNode.id.toString() === id)
        );
        if (contractDefinition) {
          definingContract = <Format.Types.ContractTypeNative>(
            definitionToStoredType(contractDefinition, compiler)
          ); //can skip reference declarations
        }
      }
      if (definingContract) {
        return {
          typeClass: "enum",
          kind: "local",
          id,
          typeName,
          definingContractName,
          definingContract,
          options
        };
      } else {
        return {
          typeClass: "enum",
          kind: "global",
          id,
          typeName,
          options
        };
      }
    }
    case "ContractDefinition": {
      let id = definition.id.toString();
      let typeName = definition.name;
      let contractKind = definition.contractKind;
      let payable = Utils.isContractPayable(definition);
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

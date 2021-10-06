/**
 * @protected
 *
 * @packageDocumentation
 */

import debugModule from "debug";
const debug = debugModule("codec:ast:import");

import BN from "bn.js";
import type * as Format from "@truffle/codec/format/common";
import type * as Common from "@truffle/codec/common";
import * as Compiler from "@truffle/codec/compiler";
import * as Utils from "@truffle/codec/ast/utils";
import type { AstNode, AstNodes } from "@truffle/codec/ast/types";
import { makeTypeId } from "@truffle/codec/contexts/import";

//NOTE: the following function will *not* work for arbitrary nodes! It will,
//however, work well enough for what we need.  I.e., it will:
//1. work when given the actual variable definition as the node,
//2. work when given an elementary type as the node,
//3. work when given a user-defined type as the node,
//4. produce something of the correct size in all cases.
//Use beyond that is at your own risk!
//NOTE: set forceLocation to *null* to force no location. leave it undefined
//to not force a location.
export function definitionToType(
  definition: AstNode,
  compilationId: string,
  compiler: Compiler.CompilerVersion,
  forceLocation?: Common.Location | null
): Format.Types.Type {
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
        case "unknown": //I guess?
        case "pre-0.5.0":
          return {
            typeClass,
            kind: "general",
            typeHint
          };
        default:
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
      let baseType = definitionToType(
        baseDefinition,
        compilationId,
        compiler,
        forceLocation
      );
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
        definitionToType(keyDefinition, compilationId, compiler, null)
      );
      //suppress the location on the key type (it'll be given as memory but
      //this is meaningless)
      //also, we have to tell TypeScript ourselves that this will be an elementary
      //type; it has no way of knowing that
      debug("definition: %O", definition);
      let valueDefinition = Utils.valueDefinition(definition);
      let valueType = definitionToType(
        valueDefinition,
        compilationId,
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
      //WARNING! This case will not work unless given the actual
      //definition!  It should return something *roughly* usable, though.
      let visibility = Utils.visibility(definition); //undefined if bad node
      let mutability = Utils.mutability(definition); //undefined if bad node
      let [inputParameters, outputParameters] = Utils.parameters(
        definition
      ) || [[], []]; //HACK
      //note: don't force a location on these! use the listed location!
      let inputParameterTypes = inputParameters.map(parameter =>
        definitionToType(parameter, compilationId, compiler)
      );
      let outputParameterTypes = outputParameters.map(parameter =>
        definitionToType(parameter, compilationId, compiler)
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
      let id = makeTypeId(Utils.typeId(definition), compilationId);
      let qualifiedName = typeHint.match(/struct (.*)/)[1];
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
      let id = makeTypeId(Utils.typeId(definition), compilationId);
      let qualifiedName = typeHint.match(/enum (.*)/)[1];
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
    case "userDefinedValueType": {
      let id = makeTypeId(Utils.typeId(definition), compilationId);
      let definingContractName: string;
      let typeName: string;
      if (typeHint.includes(".")) {
        [definingContractName, typeName] = typeHint.split(".");
      } else {
        typeName = typeHint;
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
      let id = makeTypeId(Utils.typeId(definition), compilationId);
      let typeName = typeHint.match(/(contract|library|interface) (.*)/)[2];
      //note: we use the type string rather than the type identifier
      //in order to avoid having to deal with the underscore problem
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
  compilationId: string,
  compiler: Compiler.CompilerVersion,
  referenceDeclarations?: AstNodes
): Format.Types.UserDefinedType {
  switch (definition.nodeType) {
    case "StructDefinition": {
      const {
        id,
        typeName,
        definingContractName,
        definingContract
      } = getDefiningInfo(
        definition,
        compilationId,
        compiler,
        referenceDeclarations
      );
      const memberTypes: {
        name: string;
        type: Format.Types.Type;
      }[] = definition.members.map(member => ({
        name: member.name,
        type: definitionToType(member, compilationId, compiler, null)
      }));
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
      const {
        id,
        typeName,
        definingContractName,
        definingContract
      } = getDefiningInfo(
        definition,
        compilationId,
        compiler,
        referenceDeclarations
      );
      const options = definition.members.map(member => member.name);
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
    case "UserDefinedValueTypeDefinition": {
      const {
        id,
        typeName,
        definingContractName,
        definingContract
      } = getDefiningInfo(
        definition,
        compilationId,
        compiler,
        referenceDeclarations
      );
      let underlyingType = <Format.Types.BuiltInValueType> //we know it's that, TS doesn't
        definitionToType(definition.underlyingType, compilationId, compiler, null); //final null doesn't matter here
      if (definingContract) {
        return {
          typeClass: "userDefinedValueType",
          kind: "local",
          id,
          typeName,
          definingContractName,
          definingContract,
          underlyingType
        };
      } else {
        return {
          typeClass: "userDefinedValueType",
          kind: "global",
          id,
          typeName,
          underlyingType
        };
      }
    }
    case "ContractDefinition": {
      let id = makeTypeId(definition.id, compilationId);
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

interface DefiningInfo {
  definingContract?: Format.Types.ContractTypeNative;
  definingContractName?: string;
  typeName: string;
  id: string;
}

function getDefiningInfo(
  definition: AstNode,
  compilationId: string,
  compiler: Compiler.CompilerVersion,
  referenceDeclarations?: AstNodes
): DefiningInfo {
  const id = makeTypeId(definition.id, compilationId);
  let definingContractName: string | undefined;
  let typeName: string;
  if (definition.canonicalName) {
    if (definition.canonicalName.includes(".")) {
      [definingContractName, typeName] = definition.canonicalName.split(".");
    } else {
      typeName = definition.canonicalName;
    }
  } else {
    //due to a bug, in 0.8.8 UDVTs lack a canonicalName.
    //so we'll set typeName based on name instead of canonicalName,
    //and set definingContractName below based on definingContract.
    //(this does mean that we'll mess up a bit if referenceDeclarations
    //is not passed... but realistically that shouldn't come up?  really the
    //same kind of hapepns for every type)
    typeName = definition.name;
  }
  let definingContract: Format.Types.ContractTypeNative | undefined = undefined;;
  if (referenceDeclarations) {
    let contractDefinition = Object.values(referenceDeclarations).find(
      node =>
        node.nodeType === "ContractDefinition" &&
        node.nodes.some(
          (subNode: AstNode) => makeTypeId(subNode.id, compilationId) === id
        )
    );
    if (contractDefinition) {
      definingContract = <Format.Types.ContractTypeNative>(
        definitionToStoredType(contractDefinition, compilationId, compiler)
      ); //can skip reference declarations
      if (!definingContractName) {
        definingContractName = contractDefinition.name;
      }
    }
  }
  return {
    definingContract,
    definingContractName,
    typeName,
    id
  };
}

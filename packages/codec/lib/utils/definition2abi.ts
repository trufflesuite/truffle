import debugModule from "debug";
const debug = debugModule("codec:utils:definition2abi");

import { Ast, Abi as AbiTypes } from "@truffle/codec/types";
import { Definition } from "./definition";
import * as Errors from "@truffle/codec/types/errors";

//the main function. just does some dispatch.
//returns undefined on bad input
export function definitionToAbi(node: Ast.Definition, referenceDeclarations: Ast.References): AbiTypes.AbiEntry | undefined {
  switch(node.nodeType) {
    case "FunctionDefinition":
      if(node.visibility === "public" || node.visibility === "external") {
        return functionDefinitionToAbi(node, referenceDeclarations);
      }
      else {
        return undefined;
      }
    case "EventDefinition":
      return eventDefinitionToAbi(node, referenceDeclarations);
    case "VariableDeclaration":
      if(node.visibility === "public") {
        return getterDefinitionToAbi(node, referenceDeclarations);
      }
      else {
        return undefined;
      }
    default:
      return undefined;
  }
}

//note: not for FunctionTypeNames or VariableDeclarations
function functionDefinitionToAbi(node: Ast.Definition, referenceDeclarations: Ast.References): AbiTypes.FunctionAbiEntry | AbiTypes.ConstructorAbiEntry | AbiTypes.FallbackAbiEntry {
  let kind = Definition.functionKind(node);
  let stateMutability = Definition.mutability(node);
  let payable = stateMutability === "payable";
  let constant = stateMutability === "view" || stateMutability == "pure";
  let inputs;
  switch(kind) {
    case "function":
      let name = node.name;
      let outputs = parametersToAbi(node.returnParameters.parameters, referenceDeclarations);
      inputs = parametersToAbi(node.parameters.parameters, referenceDeclarations);
      return {
        type: "function",
        name,
        inputs,
        outputs,
        stateMutability,
        constant,
        payable
      };
    case "constructor":
      inputs = parametersToAbi(node.parameters.parameters, referenceDeclarations);
      //note: need to coerce because of mutability restrictions
      return <AbiTypes.ConstructorAbiEntry> {
        type: "constructor",
        inputs,
        stateMutability,
        payable
      };
    case "fallback":
      //note: need to coerce because of mutability restrictions
      return <AbiTypes.FallbackAbiEntry> {
        type: "fallback",
        stateMutability,
        payable
      };
  }
}

function eventDefinitionToAbi(node: Ast.Definition, referenceDeclarations: Ast.References): AbiTypes.EventAbiEntry {
  let inputs = parametersToAbi(node.parameters.parameters, referenceDeclarations, true);
  let name = node.name;
  let anonymous = node.anonymous;
  return {
    type: "event",
    inputs,
    name,
    anonymous
  };
}

function parametersToAbi(nodes: Ast.Definition[], referenceDeclarations: Ast.References, checkIndexed: boolean = false): AbiTypes.AbiParameter[] {
  return nodes.map(node => parameterToAbi(node, referenceDeclarations, checkIndexed));
}

function parameterToAbi(node: Ast.Definition, referenceDeclarations: Ast.References, checkIndexed: boolean = false): AbiTypes.AbiParameter {
  let name = node.name; //may be the empty string... or even undefined for a base type
  let components: AbiTypes.AbiParameter[];
  let indexed: boolean;
  if(checkIndexed) {
    indexed = node.indexed; //note: may be undefined for a base type
  }
  let internalType: string = Definition.typeStringWithoutLocation(node);
  //is this an array? if so use separate logic
  if(Definition.typeClass(node) === "array") {
    let baseType = node.typeName ? node.typeName.baseType : node.baseType;
    let baseAbi = parameterToAbi(baseType, referenceDeclarations, checkIndexed);
    let arraySuffix = Definition.isDynamicArray(node)
      ? `[]`
      : `[${Definition.staticLength(node)}]`;
    return {
      name,
      type: baseAbi.type + arraySuffix,
      indexed,
      components: baseAbi.components,
      internalType
    };
  }
  let abiTypeString = toAbiType(node, referenceDeclarations);
  //otherwise... is it a struct? if so we need to populate components
  if(Definition.typeClass(node) === "struct") {
    let id = Definition.typeId(node);
    let referenceDeclaration = referenceDeclarations[id];
    if(referenceDeclaration === undefined) {
      let typeToDisplay = Definition.typeString(node);
      throw new Errors.UnknownUserDefinedTypeError(id.toString(), typeToDisplay);
    }
    components = parametersToAbi(referenceDeclaration.members, referenceDeclarations, checkIndexed);
  }
  return {
    name, //may be empty string but should only be undefined in recursive calls
    type: abiTypeString,
    indexed, //undefined if !checkedIndex
    components, //undefined if not a struct or (multidim) array of structs
    internalType
  };
}

//note: this is only meant for non-array types that can go in the ABI
//it returns how that type is notated in the ABI -- just the string,
//to be clear, not components of tuples
//again, NOT FOR ARRAYS
function toAbiType(node: Ast.Definition, referenceDeclarations: Ast.References): string {
  let basicType = Definition.typeClassLongForm(node); //get that whole first segment!
  switch(basicType) {
    case "contract":
      return "address";
    case "struct":
      return "tuple"; //the more detailed checking will be handled elsewhere
    case "enum":
      let referenceId = Definition.typeId(node);
      let referenceDeclaration = referenceDeclarations[referenceId];
      if(referenceDeclaration === undefined) {
        let typeToDisplay = Definition.typeString(node);
        throw new Errors.UnknownUserDefinedTypeError(referenceId.toString(), typeToDisplay);
      }
      let numOptions = referenceDeclaration.members.length;
      let bits = 8 * Math.ceil(Math.log2(numOptions) / 8);
      return `uint${bits}`;
    default:
      return basicType;
      //note that: int/uint/fixed/ufixed/bytes will have their size and such left on;
      //address will have "payable" left off;
      //external functions will be reduced to "function" (and internal functions shouldn't
      //be passed in!)
      //(mappings shouldn't be passed in either obviously)
      //(nor arrays :P )
  }
}

function getterDefinitionToAbi(node: Ast.Definition, referenceDeclarations: Ast.References): AbiTypes.FunctionAbiEntry {
  debug("getter node: %O", node);
  let name = node.name;
  let { inputs, outputs } = getterParameters(node, referenceDeclarations);
  let inputsAbi = parametersToAbi(inputs, referenceDeclarations);
  let outputsAbi = parametersToAbi(outputs, referenceDeclarations);
  return {
    type: "function",
    name,
    inputs: inputsAbi,
    outputs: outputsAbi,
    stateMutability: "view",
    constant: true,
    payable: false
  };
}

//how getter parameters work:
//INPUT:
//types other than arrays and mappings take no input.
//array getters take uint256 input. mapping getters take input of their key type.
//if arrays, mappings, stacked, then takes multiple inputs, in order from outside
//to in.
//These parameters are unnamed.
//OUTPUT:
//if base type (beneath mappings & arrays) is not a struct, returns that.
//(This return parameter has no name -- it is *not* named for the variable!)
//if it is a struct, returns multiple outputs, one for each member of the struct,
//*except* arrays and mappings.  (And they have names, the names of the members.)
//important note: inner structs within a struct are just returned, not
//partially destructured like the outermost struct!  Yes, this is confusing.

//here's a simplified function that just does the inputs. it's for use by the
//allocator. I'm keeping it separate because it doesn't require a
//referenceDeclarations argument.
export function getterInputs(node: Ast.Definition): Ast.Definition[] {
  node = node.typeName || node;
  let inputs: Ast.Definition[] = [];
  while(Definition.typeClass(node) === "array" || Definition.typeClass(node) === "mapping") {
    let keyNode = Definition.keyDefinition(node); //note: if node is an array, this spoofs up a uint256 definition
    inputs.push({...keyNode, name: ""}); //getter input params have no name
    switch(Definition.typeClass(node)) {
      case "array":
        node = node.baseType;
        break;
      case "mapping":
        node = node.valueType;
        break;
    }
  }
  return inputs;
}

//again, despite the duplication, this function is kept separate from the
//more straightforward getterInputs function because, since it has to handle
//outputs too, it requires referenceDeclarations
function getterParameters(node: Ast.Definition, referenceDeclarations: Ast.References): {inputs: Ast.Definition[], outputs: Ast.Definition[]} {
  let baseNode: Ast.Definition = node.typeName || node;
  let inputs: Ast.Definition[] = [];
  while(Definition.typeClass(baseNode) === "array" || Definition.typeClass(baseNode) === "mapping") {
    let keyNode = Definition.keyDefinition(baseNode); //note: if baseNode is an array, this spoofs up a uint256 definition
    inputs.push({...keyNode, name: ""}); //again, getter input params have no name
    switch(Definition.typeClass(baseNode)) {
      case "array":
        baseNode = baseNode.baseType;
        break;
      case "mapping":
        baseNode = baseNode.valueType;
        break;
    }
  }
  //at this point, baseNode should hold the base type
  //now we face the question: is it a struct?
  if(Definition.typeClass(baseNode) === "struct") {
    let id = Definition.typeId(baseNode);
    let referenceDeclaration = referenceDeclarations[id];
    if(referenceDeclaration === undefined) {
      let typeToDisplay = Definition.typeString(baseNode);
      throw new Errors.UnknownUserDefinedTypeError(id.toString(), typeToDisplay);
    }
    let outputs = referenceDeclaration.members.filter(
      member => Definition.typeClass(member) !== "array" && Definition.typeClass(member) !== "mapping"
    );
    return { inputs, outputs }; //no need to wash name!
  }
  else {
    //only one output; it's just the base node, with its name washed
    return { inputs, outputs: [{...baseNode, name: ""}] };
  }
}

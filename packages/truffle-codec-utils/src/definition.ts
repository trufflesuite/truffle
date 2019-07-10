import debugModule from "debug";
const debug = debugModule("codec-utils:definition");

import { EVM as EVMUtils } from "./evm";
import { AstDefinition, AstReferences, Scopes, Visibility, Mutability, Location, ContractKind } from "./ast";
import { Contexts } from "./contexts";
import { CompilerVersion } from "./compiler";
import { AbiUtils } from "./abi";
import { UnknownUserDefinedTypeError } from "./errors";
import BN from "bn.js";
import cloneDeep from "lodash.clonedeep";
import semver from "semver";

export namespace Definition {

  export function typeIdentifier(definition: AstDefinition): string {
    return definition.typeDescriptions.typeIdentifier;
  }

  export function typeString(definition: AstDefinition): string {
    return definition.typeDescriptions.typeString;
  }

  /**
   * returns basic type class for a variable definition node
   * e.g.:
   *  `t_uint256` becomes `uint`
   *  `t_struct$_Thing_$20_memory_ptr` becomes `struct`
   */
  export function typeClass(definition: AstDefinition): string {
    return typeIdentifier(definition).match(/t_([^$_0-9]+)/)[1];
  }

  export function typeClassLongForm(definition: AstDefinition): string {
    return typeIdentifier(definition).match(/t_([^$_]+)/)[1];
  }

  //for user-defined types -- structs, enums, contracts
  //often you can get these from referencedDeclaration, but not
  //always
  export function typeId(definition: AstDefinition): number {
    debug("definition %O", definition);
    return parseInt(
      typeIdentifier(definition)
        .match(/\$(\d+)(_(storage|memory|calldata)(_ptr)?)?$/)[1]);
  }

  /**
   * For function types; returns internal or external
   * (not for use on other types! will cause an error!)
   * should only return "internal" or "external"
   */
  export function visibility(definition: AstDefinition): Visibility {
    return <Visibility> (definition.typeName ?
      definition.typeName.visibility : definition.visibility);
  }


  /**
   * e.g. uint48 -> 6
   * @return size in bytes for explicit type size, or `null` if not stated
   */
  export function specifiedSize(definition: AstDefinition): number {
    let specified = typeIdentifier(definition).match(/t_[a-z]+([0-9]+)/);

    if (!specified) {
      return null;
    }

    let num = parseInt(specified[1]);

    switch (typeClass(definition)) {
      case "int":
      case "uint":
      case "fixed":
      case "ufixed":
        return num / 8;

      case "bytes":
        return num;

      default:
        debug("Unknown type for size specification: %s", typeIdentifier(definition));
    }
  }

  /**
   * for fixed-point types, obviously
   */
  export function decimalPlaces(definition: AstDefinition): number {
    return parseInt(
      typeIdentifier(definition).match(/t_[a-z]+[0-9]+x([0-9]+)/)[1]
    );
  }

  export function isArray(definition: AstDefinition): boolean {
    return typeIdentifier(definition).match(/^t_array/) != null;
  }

  export function isDynamicArray(definition: AstDefinition): boolean {
    return isArray(definition) && (
      //NOTE: we do this by parsing the type identifier, rather than by just
      //checking the length field, because we might be using this on a faked-up
      //definition
      typeIdentifier(definition).match(
        /\$dyn_(storage|memory|calldata)(_ptr)?$/) != null
    );
  }

  //length of a statically sized array -- please only use for arrays
  //already verified to be static!
  export function staticLength(definition: AstDefinition): number {
    //NOTE: we do this by parsing the type identifier, rather than by just
    //checking the length field, because we might be using this on a faked-up
    //definition
    return parseInt(staticLengthAsString(definition));
  }

  //see staticLength for explanation
  export function staticLengthAsString(definition: AstDefinition): string {
    return typeIdentifier(definition).match(
      /\$(\d+)_(storage|memory|calldata)(_ptr)?$/)[1];
  }

  export function isStruct(definition: AstDefinition): boolean {
    return typeIdentifier(definition).match(/^t_struct/) != null;
  }

  export function isMapping(definition: AstDefinition): boolean {
    return typeIdentifier(definition).match(/^t_mapping/) != null;
  }

  export function isEnum(definition: AstDefinition): boolean {
    return typeIdentifier(definition).match(/^t_enum/) != null;
  }

  export function isReference(definition: AstDefinition): boolean {
    return typeIdentifier(definition).match(/_(memory|storage|calldata)(_ptr)?$/) != null;
  }

  //HACK: you can set compiler to null to force nonpayable
  export function isAddressPayable(definition: AstDefinition, compiler: CompilerVersion | null): boolean {
    if(compiler === null) {
      return false;
    }
    if(semver.satisfies(compiler.version, ">=0.5.0", {includePrerelease: true})) {
      return typeIdentifier(definition) === "t_address_payable";
    }
    else {
      return true;
    }
  }

  //note: only use this on things already verified to be references
  export function referenceType(definition: AstDefinition): Location {
    return typeIdentifier(definition).match(/_([^_]+)(_ptr)?$/)[1] as Location;
  }

  //only for contract types, obviously! will yield nonsense otherwise!
  export function contractKind(definition: AstDefinition): ContractKind {
    return typeString(definition).split(" ")[0] as ContractKind;
  }

  //stack size, in words, of a given type
  export function stackSize(definition: AstDefinition): number {
    if(typeClass(definition) === "function" &&
      visibility(definition) === "external") {
      return 2;
    }
    if(isReference(definition) && referenceType(definition) === "calldata") {
      if(typeClass(definition) === "string" ||
        typeClass(definition) === "bytes") {
        return 2;
      }
      if(isDynamicArray(definition)) {
        return 2;
      }
    }
    return 1;
  }

  export function isSimpleConstant(definition: AstDefinition): boolean {
    const types = ["stringliteral", "rational"];
    return types.includes(typeClass(definition));
  }

  //definition: a storage reference definition
  //location: the location you want it to refer to instead
  export function spliceLocation(definition: AstDefinition, location: Location): AstDefinition {
    debug("definition %O", definition);
    return {
      ...definition,

      typeDescriptions: {
        ...definition.typeDescriptions,

        typeIdentifier:
          definition.typeDescriptions.typeIdentifier
            .replace(/_(storage|memory|calldata)(?=_ptr$|$)/, "_" + location)
      }
    };
  }

  //adds "_ptr" on to the end of type identifiers that might need it; note that
  //this operats on identifiers, not definitions
  export function restorePtr(identifier: string): string {
    return identifier.replace(/(?<=_(storage|memory|calldata))$/, "_ptr");
  }

  //extract the actual numerical value from a node of type rational.
  //currently assumes result will be integer (currently returns BN)
  export function rationalValue(definition: AstDefinition): BN {
    let identifier = typeIdentifier(definition);
    let absoluteValue: string = identifier.match(/_(\d+)_by_1$/)[1];
    let isNegative: boolean = identifier.match(/_minus_/) != null;
    return isNegative? new BN(absoluteValue).neg() : new BN(absoluteValue);
  }

  export function baseDefinition(definition: AstDefinition): AstDefinition {
    if (definition.typeName && definition.typeName.baseType) {
      return definition.typeName.baseType;
    }

    if (definition.baseType) {
      return definition.baseType;
    }

    //otherwise, we'll have to fake it up ourselves
    let baseIdentifier = typeIdentifier(definition)
      .match(/^t_array\$_(.*)_\$/)[1];
      //greedy match to extract everything from first to last dollar sign

    // HACK - internal types for memory or storage also seem to be pointers
    if (baseIdentifier.match(/_(memory|storage|calldata)$/) != null) {
      baseIdentifier = `${baseIdentifier}_ptr`;
    }

    // another HACK - we get away with it because we're only using that one property
    let result: AstDefinition = cloneDeep(definition);
    result.typeDescriptions.typeIdentifier = baseIdentifier;
    return result;

    //WARNING -- these hacks do *not* correctly handle all cases!
    //they do, however, handle the cases we currently need.
  }

  //for use for mappings and arrays only!
  //for arrays, fakes up a uint definition
  export function keyDefinition(definition: AstDefinition, scopes?: Scopes): AstDefinition {
    let result: AstDefinition;
    switch(typeClass(definition)) {
      case "mapping":
        let baseDeclarationId = definition.referencedDeclaration;
        debug("baseDeclarationId %d", baseDeclarationId);
        //if there's a referencedDeclaration, we'll use that
        if(baseDeclarationId !== undefined) {
          let baseDeclaration = scopes[baseDeclarationId].definition;
          return baseDeclaration.keyType || baseDeclaration.typeName.keyType;
        }
        //otherwise, we'll need to perform some hackery, similarly to in baseDefinition
        
        //otherwise, we'll have to fake it up ourselves
        let keyIdentifier = typeIdentifier(definition)
          .match(/^t_mapping\$_(.*?)_\$/)[1];
          //use *non*-greedy match; note that if the key type could include
          //dollar signs, this could cause a problem, but user-defined types
          //are not allowed as key types, so this can't come up

        // HACK - internal types for memory or storage also seem to be pointers
        if (keyIdentifier.match(/_(memory|storage|calldata)$/) != null) {
          keyIdentifier = `${keyIdentifier}_ptr`;
        }

        // another HACK - we get away with it because we're only using that one property
        result = cloneDeep(definition);
        result.typeDescriptions.typeIdentifier = keyIdentifier;
        return result;

      case "array":
        //HACK -- again we should get away with it because for a uint256 we don't
        //really need to inspect the other properties
        result = cloneDeep(definition);
        result.typeDescriptions.typeIdentifier = "t_uint256";
        return result;
      default:
        debug("unrecognized index access!");
    }
  }

  //returns input parameters, then output parameters
  //NOTE: ONLY FOR VARIABLE DECLARATIONS OF FUNCTION TYPE
  //NOT FOR FUNCTION DEFINITIONS
  export function parameters(definition: AstDefinition): [AstDefinition[], AstDefinition[]] {
    let typeObject = definition.typeName || definition;
    return [typeObject.parameterTypes.parameters, typeObject.returnParameterTypes.parameters];
  }

  //compatibility function, since pre-0.5.0 functions don't have node.kind
  //returns undefined if you don't put in a function node
  export function functionKind(node: AstDefinition): string | undefined {
    if(node.nodeType !== "FunctionDefinition") {
      return undefined;
    }
    if(node.kind !== undefined) {
      //if we're dealing with 0.5.x, we can just read node.kind
      return node.kind;
    }
    //otherwise, we need this little shim
    if(node.isConstructor) {
      return "constructor";
    }
    return node.name === ""
      ? "fallback"
      : "function";
  }

  //similar compatibility function for mutability for pre-0.4.16 versions
  //returns undefined if you don't give it a FunctionDefinition or
  //VariableDeclaration
  export function mutability(node: AstDefinition): Mutability | undefined {
    node = node.typeName || node;
    if(node.nodeType !== "FunctionDefinition" && node.nodeType !== "FunctionTypeName") {
      return undefined;
    }
    if(node.stateMutability !== undefined) {
      //if we're dealing with 0.4.16 or later, we can just read node.stateMutability
      return node.stateMutability;
    }
    //otherwise, we need this little shim
    if(node.payable) {
      return "payable";
    }
    if(node.constant) {
      //yes, it means "view" even if you're looking at a variable declaration!
      //old Solidity was weird!
      return "view";
    }
    return "nonpayable";
  }

  //takes a contract definition and asks, does it have a payable fallback function?
  export function isContractPayable(definition: AstDefinition): boolean {
    let fallback = definition.nodes.find(
      node => node.nodeType === "FunctionDefinition" &&
        functionKind(node) === "fallback"
    );
    if(!fallback) {
      return false;
    }
    return mutability(fallback) === "payable";
  }

  //spoofed definitions we'll need
  //we'll give them id -1 to indicate that they're spoofed

  export const NOW_DEFINITION: AstDefinition = {
    id: -1,
    src: "0:0:-1",
    name: "now",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_uint256",
      typeString: "uint256"
    }
  }

  export const MSG_DEFINITION: AstDefinition = {
    id: -1,
    src: "0:0:-1",
    name: "msg",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_magic_message",
      typeString: "msg"
    }
  };

  export const TX_DEFINITION: AstDefinition = {
    id: -1,
    src: "0:0:-1",
    name: "tx",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_magic_transaction",
      typeString: "tx"
    }
  };

  export const BLOCK_DEFINITION: AstDefinition = {
    id: -1,
    src: "0:0:-1",
    name: "block",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_magic_block",
      typeString: "block"
    }
  };

  export function spoofThisDefinition(contractName: string, contractId: number, contractKind: ContractKind): AstDefinition {
    let formattedName = contractName.replace(/\$/g, "$$".repeat(3));
    //note that string.replace treats $'s specially in the replacement string;
    //we want 3 $'s for each $ in the input, so we need to put *6* $'s in the
    //replacement string
    return {
      id: -1,
      src: "0:0:-1",
      name: "this",
      nodeType: "VariableDeclaration",
      typeDescriptions: {
        typeIdentifier: "t_contract$_" + formattedName + "_$" + contractId,
	typeString: contractKind + " " + contractName
      }
    }
  }

  //section: converting a definition to an ABI entry!

  //the main function. just does some dispatch.
  //returns undefined on bad input
  export function definitionToAbi(node: AstDefinition, referenceDeclarations: AstReferences): AbiUtils.AbiEntry | undefined {
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
  function functionDefinitionToAbi(node: AstDefinition, referenceDeclarations: AstReferences): AbiUtils.FunctionAbiEntry | AbiUtils.ConstructorAbiEntry | AbiUtils.FallbackAbiEntry {
    let kind = functionKind(node);
    let stateMutability = mutability(node);
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
        //note: need to coerce because of mutability restructions
        return <AbiUtils.ConstructorAbiEntry> {
          type: "constructor",
          inputs,
          stateMutability,
          payable
        };
      case "fallback":
        //note: need to coerce because of mutability restructions
        return <AbiUtils.FallbackAbiEntry> {
          type: "fallback",
          stateMutability,
          payable
        };
    }
  }

  function eventDefinitionToAbi(node: AstDefinition, referenceDeclarations: AstReferences): AbiUtils.EventAbiEntry {
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

  function parametersToAbi(nodes: AstDefinition[], referenceDeclarations: AstReferences, checkIndexed: boolean = false): AbiUtils.AbiParameter[] {
    return nodes.map(node => parameterToAbi(node, referenceDeclarations, checkIndexed));
  }

  function parameterToAbi(node: AstDefinition, referenceDeclarations: AstReferences, checkIndexed: boolean = false): AbiUtils.AbiParameter {
    let name = node.name; //may be the empty string... or even undefined for a base type
    let components: AbiUtils.AbiParameter[];
    let indexed: boolean;
    if(checkIndexed) {
      indexed = node.indexed; //note: may be undefined for a base type
    }
    //is this an array? if so use separate logic
    if(typeClass(node) === "array") {
      let baseType = node.typeName ? node.typeName.baseType : node.baseType;
      let baseAbi = parameterToAbi(baseType, referenceDeclarations, checkIndexed);
      let arraySuffix = isDynamicArray(node)
        ? `[]`
        : `[${staticLength(node)}]`;
      return {
        name,
        type: baseAbi.type + arraySuffix,
        indexed,
        components: baseAbi.components
      };
    }
    let abiTypeString = toAbiType(node, referenceDeclarations);
    //otherwise... is it a struct? if so we need to populate components
    if(typeClass(node) === "struct") {
      let id = typeId(node);
      let referenceDeclaration = referenceDeclarations[id];
      if(referenceDeclaration === undefined) {
        let typeToDisplay = typeString(node);
        throw new UnknownUserDefinedTypeError(id, typeToDisplay);
      }
      components = parametersToAbi(referenceDeclaration.members, referenceDeclarations, checkIndexed);
    }
    return {
      name, //may be empty string but should only be undefined in recursive calls
      type: abiTypeString,
      indexed, //undefined if !checkedIndex
      components //undefined if not a struct or (multidim) array of structs
    };
  }

  //note: this is only meant for non-array types that can go in the ABI
  //it returns how that type is notated in the ABI -- just the string,
  //to be clear, not components of tuples
  //again, NOT FOR ARRAYS
  function toAbiType(node: AstDefinition, referenceDeclarations: AstReferences): string {
    let basicType = typeClassLongForm(node); //get that whole first segment!
    switch(basicType) {
      case "contract":
        return "address";
      case "struct":
        return "tuple"; //the more detailed checking will be handled elsewhere
      case "enum":
        let referenceId = typeId(node);
        let referenceDeclaration = referenceDeclarations[referenceId];
        if(referenceDeclaration === undefined) {
          let typeToDisplay = typeString(node);
          throw new UnknownUserDefinedTypeError(referenceId, typeToDisplay);
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

  function getterDefinitionToAbi(node: AstDefinition, referenceDeclarations: AstReferences): AbiUtils.FunctionAbiEntry {
    debug("getter node: %O", node);
    let name = node.name;
    let { inputs, outputs, isBaseStruct } = getterParameters(node, referenceDeclarations);
    let inputsAbi = washNames(parametersToAbi(inputs, referenceDeclarations));
    debug("inputsAbi: %O", inputsAbi);
    let outputsAbi = isBaseStruct
      ? parametersToAbi(outputs, referenceDeclarations) //output parameters for a struct getter are named!
      : washNames(parametersToAbi(outputs, referenceDeclarations));
    debug("outputsAbi: %O", inputsAbi);
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

  function washNames(parameters: AbiUtils.AbiParameter[]): AbiUtils.AbiParameter[] {
    return parameters.map(parameter => ({...parameter, name: ""}));
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
  export function getterInputs(node: AstDefinition): AstDefinition[] {
    node = node.typeName || node;
    let inputs: AstDefinition[] = [];
    while(typeClass(node) === "array" || typeClass(node) === "mapping") {
      let keyNode = keyDefinition(node); //note: if node is an array, this spoofs up a uint256 definition
      inputs.push(keyNode);
      switch(typeClass(node)) {
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
  function getterParameters(node: AstDefinition, referenceDeclarations: AstReferences): {inputs: AstDefinition[], outputs: AstDefinition[], isBaseStruct: boolean} {
    let baseNode: AstDefinition = node.typeName || node;
    let inputs: AstDefinition[] = [];
    while(typeClass(baseNode) === "array" || typeClass(baseNode) === "mapping") {
      let keyNode = keyDefinition(baseNode); //note: if baseNode is an array, this spoofs up a uint256 definition
      inputs.push(keyNode);
      debug("pushed: %O", keyNode);
      switch(typeClass(baseNode)) {
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
    if(typeClass(baseNode) === "struct") {
      let id = typeId(baseNode);
      let referenceDeclaration = referenceDeclarations[id];
      if(referenceDeclaration === undefined) {
        let typeToDisplay = typeString(baseNode);
        throw new UnknownUserDefinedTypeError(id, typeToDisplay);
      }
      let outputs = referenceDeclaration.members.filter(
        member => typeClass(member) !== "array" && typeClass(member) !== "mapping"
      );
      return { inputs, outputs, isBaseStruct: true };
    }
    else {
      //only one output
      return { inputs, outputs: [baseNode], isBaseStruct: false };
    }
  }

}

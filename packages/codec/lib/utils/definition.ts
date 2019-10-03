import debugModule from "debug";
const debug = debugModule("codec:utils:definition");

import { Ast } from "@truffle/codec/types";
import { Visibility, Mutability, Location, ContractKind } from "@truffle/codec/types/common";
import * as Compiler from "@truffle/codec/types/compiler";
import BN from "bn.js";
import cloneDeep from "lodash.clonedeep";

export namespace Definition {

  export function typeIdentifier(definition: Ast.Definition): string {
    return definition.typeDescriptions.typeIdentifier;
  }

  export function typeString(definition: Ast.Definition): string {
    return definition.typeDescriptions.typeString;
  }

  //returns the type string, but with location (if any) stripped off the end
  export function typeStringWithoutLocation(definition: Ast.Definition): string {
    return typeString(definition).replace(/ (storage|memory|calldata)$/, "");
  }

  /**
   * returns basic type class for a variable definition node
   * e.g.:
   *  `t_uint256` becomes `uint`
   *  `t_struct$_Thing_$20_memory_ptr` becomes `struct`
   */
  export function typeClass(definition: Ast.Definition): string {
    return typeIdentifier(definition).match(/t_([^$_0-9]+)/)[1];
  }

  /**
   * similar to typeClass, but includes any numeric qualifiers
   * e.g.:
   * `t_uint256` becomes `uint256`
   */
  export function typeClassLongForm(definition: Ast.Definition): string {
    return typeIdentifier(definition).match(/t_([^$_]+)/)[1];
  }

  //for user-defined types -- structs, enums, contracts
  //often you can get these from referencedDeclaration, but not
  //always
  export function typeId(definition: Ast.Definition): number {
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
  export function visibility(definition: Ast.Definition): Visibility {
    return <Visibility> (definition.typeName ?
      definition.typeName.visibility : definition.visibility);
  }


  /**
   * e.g. uint48 -> 6
   * @return size in bytes for explicit type size, or `null` if not stated
   */
  export function specifiedSize(definition: Ast.Definition): number {
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
  export function decimalPlaces(definition: Ast.Definition): number {
    return parseInt(
      typeIdentifier(definition).match(/t_[a-z]+[0-9]+x([0-9]+)/)[1]
    );
  }

  export function isArray(definition: Ast.Definition): boolean {
    return typeIdentifier(definition).match(/^t_array/) != null;
  }

  export function isDynamicArray(definition: Ast.Definition): boolean {
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
  export function staticLength(definition: Ast.Definition): number {
    //NOTE: we do this by parsing the type identifier, rather than by just
    //checking the length field, because we might be using this on a faked-up
    //definition
    return parseInt(staticLengthAsString(definition));
  }

  //see staticLength for explanation
  export function staticLengthAsString(definition: Ast.Definition): string {
    return typeIdentifier(definition).match(
      /\$(\d+)_(storage|memory|calldata)(_ptr)?$/)[1];
  }

  export function isStruct(definition: Ast.Definition): boolean {
    return typeIdentifier(definition).match(/^t_struct/) != null;
  }

  export function isMapping(definition: Ast.Definition): boolean {
    return typeIdentifier(definition).match(/^t_mapping/) != null;
  }

  export function isEnum(definition: Ast.Definition): boolean {
    return typeIdentifier(definition).match(/^t_enum/) != null;
  }

  export function isReference(definition: Ast.Definition): boolean {
    return typeIdentifier(definition).match(/_(memory|storage|calldata)(_ptr)?$/) != null;
  }

  //note: only use this on things already verified to be references
  export function referenceType(definition: Ast.Definition): Location {
    return typeIdentifier(definition).match(/_([^_]+)(_ptr)?$/)[1] as Location;
  }

  //only for contract types, obviously! will yield nonsense otherwise!
  export function contractKind(definition: Ast.Definition): ContractKind {
    return typeString(definition).split(" ")[0] as ContractKind;
  }

  //stack size, in words, of a given type
  export function stackSize(definition: Ast.Definition): number {
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

  export function isSimpleConstant(definition: Ast.Definition): boolean {
    const types = ["stringliteral", "rational"];
    return types.includes(typeClass(definition));
  }

  //definition: a storage reference definition
  //location: the location you want it to refer to instead
  export function spliceLocation(definition: Ast.Definition, location: Location): Ast.Definition {
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
  export function rationalValue(definition: Ast.Definition): BN {
    let identifier = typeIdentifier(definition);
    let absoluteValue: string = identifier.match(/_(\d+)_by_1$/)[1];
    let isNegative: boolean = identifier.match(/_minus_/) != null;
    return isNegative? new BN(absoluteValue).neg() : new BN(absoluteValue);
  }

  export function baseDefinition(definition: Ast.Definition): Ast.Definition {
    if (definition.typeName && definition.typeName.baseType) {
      return definition.typeName.baseType;
    }

    if (definition.baseType) {
      return definition.baseType;
    }

    //otherwise, we'll have to spoof it up ourselves
    let baseIdentifier = typeIdentifier(definition)
      .match(/^t_array\$_(.*)_\$/)[1];
      //greedy match to extract everything from first to last dollar sign

    // HACK - internal types for memory or storage also seem to be pointers
    if (baseIdentifier.match(/_(memory|storage|calldata)$/) != null) {
      baseIdentifier = `${baseIdentifier}_ptr`;
    }

    // another HACK - we get away with it because we're only using that one property
    let result: Ast.Definition = cloneDeep(definition);
    result.typeDescriptions.typeIdentifier = baseIdentifier;
    return result;

    //WARNING -- these hacks do *not* correctly handle all cases!
    //they do, however, handle the cases we currently need.
  }

  //for use for mappings and arrays only!
  //for arrays, fakes up a uint definition
  export function keyDefinition(definition: Ast.Definition, scopes?: Ast.Scopes): Ast.Definition {
    let result: Ast.Definition;
    switch(typeClass(definition)) {
      case "mapping":
        //first: is there a key type already there? if so just use that
        if(definition.keyType) {
          return definition.keyType;
        }
        if(definition.typeName && definition.typeName.keyType) {
          return definition.typeName.keyType;
        }

        //otherwise: is there a referencedDeclaration? if so try using that
        let baseDeclarationId = definition.referencedDeclaration;
        debug("baseDeclarationId %d", baseDeclarationId);
        //if there's a referencedDeclaration, we'll use that
        if(baseDeclarationId !== undefined) {
          let baseDeclaration = scopes[baseDeclarationId].definition;
          return baseDeclaration.keyType || baseDeclaration.typeName.keyType;
        }

        //otherwise, we'll need to perform some hackery, similarly to in baseDefinition;
        //we'll have to spoof it up ourselves
        let keyIdentifier = typeIdentifier(definition)
          .match(/^t_mapping\$_(.*?)_\$/)[1];
          //use *non*-greedy match; note that if the key type could include
          //dollar signs, this could cause a problem, but user-defined types
          //are not allowed as key types, so this can't come up

        // HACK - internal types for memory or storage also seem to be pointers
        if (keyIdentifier.match(/_(memory|storage|calldata)$/) != null) {
          keyIdentifier = `${keyIdentifier}_ptr`;
        }

        let keyString = typeString(definition)
          .match(/mapping\((.*?) => .*\)( storage)?$/)[1];
          //use *non*-greedy match; note that if the key type could include
          //"=>", this could cause a problem, but mappings are not allowed as key
          //types, so this can't come up

        // another HACK - we get away with it because we're only using that one property
        result = cloneDeep(definition);
        result.typeDescriptions = {
          typeIdentifier: keyIdentifier,
          typeString: keyString
        };
        return result;

      case "array":
        //HACK -- again we should get away with it because for a uint256 we don't
        //really need to inspect the other properties
        result = cloneDeep(definition);
        result.typeDescriptions = {
          typeIdentifier: "t_uint256",
          typeString: "uint256"
        };
        return result;
      default:
        debug("unrecognized index access!");
    }
  }

  //returns input parameters, then output parameters
  //NOTE: ONLY FOR VARIABLE DECLARATIONS OF FUNCTION TYPE
  //NOT FOR FUNCTION DEFINITIONS
  export function parameters(definition: Ast.Definition): [Ast.Definition[], Ast.Definition[]] {
    let typeObject = definition.typeName || definition;
    return [typeObject.parameterTypes.parameters, typeObject.returnParameterTypes.parameters];
  }

  //compatibility function, since pre-0.5.0 functions don't have node.kind
  //returns undefined if you don't put in a function node
  export function functionKind(node: Ast.Definition): string | undefined {
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
  export function mutability(node: Ast.Definition): Mutability | undefined {
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
  export function isContractPayable(definition: Ast.Definition): boolean {
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

  export const NOW_DEFINITION: Ast.Definition = {
    id: -1,
    src: "0:0:-1",
    name: "now",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_uint256",
      typeString: "uint256"
    }
  }

  export const MSG_DEFINITION: Ast.Definition = {
    id: -1,
    src: "0:0:-1",
    name: "msg",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_magic_message",
      typeString: "msg"
    }
  };

  export const TX_DEFINITION: Ast.Definition = {
    id: -1,
    src: "0:0:-1",
    name: "tx",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_magic_transaction",
      typeString: "tx"
    }
  };

  export const BLOCK_DEFINITION: Ast.Definition = {
    id: -1,
    src: "0:0:-1",
    name: "block",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_magic_block",
      typeString: "block"
    }
  };

  export function spoofThisDefinition(contractName: string, contractId: number, contractKind: ContractKind): Ast.Definition {
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

}

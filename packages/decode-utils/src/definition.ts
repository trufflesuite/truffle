import debugModule from "debug";
const debug = debugModule("decode-utils:definition");

import { EVM as EVMUtils } from "./evm";
import { AstDefinition, Scopes } from "./ast";
import BN from "bn.js";
import cloneDeep from "lodash.clonedeep";

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
  export function visibility(definition: AstDefinition): string {
    return definition.typeName ?
      definition.typeName.visibility : definition.visibility;
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
        // debug("Unknown type for size specification: %s", typeIdentifier(definition));
    }
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
    return parseInt(typeIdentifier(definition).match(
      /\$(\d+)_(storage|memory|calldata)(_ptr)?$/)[1]);
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

  //note: only use this on things already verified to be references
  export function referenceType(definition: AstDefinition): string {
    return typeIdentifier(definition).match(/_([^_]+)(_ptr)?$/)[1];
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
  export function spliceLocation(definition: AstDefinition, location: string): AstDefinition {
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
  //this operats on identifiers, not defintions
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

  //keyEncoding is used to let soliditySha3 know how to interpret the
  //key for hashing... but if you just give it the honest type, it
  //won't pad, and for value types we need it to pad.
  //Thus, ints and value bytes become the *largest* size of that type
  //addresses are treated by Solidity as uint160, so we mark them uint
  //to get the correct padding
  //bool... I can't get soliditySha3 to pad a bool no matter what, so
  //we'll leave it undefined and handle it manually
  //note that while fixed and ufixed don't exist yet, they would
  //presumably use fixed256xM and ufixed256xM, where M is the precision
  export function keyEncoding(keyDefinition: AstDefinition): string | undefined {
    switch(typeClass(keyDefinition)) {
      case "string":
        return "string";
      case "bytes":
        if(specifiedSize(keyDefinition) === null) {
          return "bytes";
        }
        return "bytes32";
      case "uint":
      case "address":
        return "uint";
      case "int":
        return "int";
      case "bool":
        return undefined; //HACK
        break;
    }
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
  export function keyDefinition(definition: AstDefinition, scopes: Scopes): AstDefinition {
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

  //spoofed definitions we'll need
  //we'll give them id -1 to indicate that they're spoofed

  //id, name, nodeType, typeDescriptions.typeIdentifier
  export function spoofUintDefinition(name: string): AstDefinition {
    return {
      id: -1,
      name,
      nodeType: "VariableDeclaration",
      typeDescriptions: {
        typeIdentifier: "t_uint256"
      }
    };
  }

  export function spoofAddressPayableDefinition(name: string): AstDefinition {
    return {
      id: -1,
      name,
      nodeType: "VariableDeclaration",
      typeDescriptions: {
        typeIdentifier: "t_address_payable"
      }
    };
  }

  export const MSG_SIG_DEFINITION: AstDefinition = {
    id: -1,
    name: "sig",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_bytes" + EVMUtils.SELECTOR_SIZE
    }
  };

  export const MSG_DATA_DEFINITION: AstDefinition = {
    id: -1,
    name: "data",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_bytes_calldata_ptr"
    }
  };

  export const MSG_DEFINITION: AstDefinition = {
    id: -1,
    name: "msg",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_magic_message"
    }
  };

  export const TX_DEFINITION: AstDefinition = {
    id: -1,
    name: "tx",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_magic_transaction"
    }
  };

  export const BLOCK_DEFINITION: AstDefinition = {
    id: -1,
    name: "block",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_magic_block"
    }
  };

  export function spoofThisDefinition(contractName: string, contractId: number): AstDefinition {
    let formattedName = contractName.replace(/\$/g, "$$".repeat(3));
    //note that string.replace treats $'s specially in the replacement string;
    //we want 3 $'s for each $ in the input, so we need to put *6* $'s in the
    //replacement string
    return {
      id: -1,
      name: "this",
      nodeType: "VariableDeclaration",
      typeDescriptions: {
        typeIdentifier: "t_contract$_" + formattedName + "_$" + contractId
      }
    }
  }

}

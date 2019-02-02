import debugModule from "debug";
const debug = debugModule("decode-utils:definition");

import { EVM as EVMUtils } from "./evm";
import { AstDefinition } from "./ast";
import cloneDeep from "lodash.clonedeep";
import BN from "bn.js";

export namespace Definition {

  export function typeIdentifier(definition: AstDefinition): string {
    return definition.typeDescriptions.typeIdentifier;
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

  /**
   * For function types; returns internal or external
   * (not for use on other types! will cause an error!)
   * should only return "internal" or "external"
   */
  export function visibility(definition: AstDefinition): string {
    return definition.visibility || definition.typeName.visibility;
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
      definition.typeName
        ? definition.typeName.length == null
        : definition.length == null
    );
  }

  //length of a statically sized array -- please only use for arrays
  //already verified to be static!
  export function staticLength(definition: AstDefinition): number {
   return definition.typeName
    ? parseInt(definition.typeName.length.value)
    : parseInt(definition.length.value);
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

  export function isContract(definition: AstDefinition): boolean {
    return typeIdentifier(definition).match(/^t_contract/) != null;
  }

  export function isReference(definition: AstDefinition): boolean {
    return typeIdentifier(definition).match(/_(memory|storage)(_ptr)?$/) != null;
  }

  export function isContractType(definition: AstDefinition): boolean {
    // checks whether the given node is a contract *type*, rather than whether
    // it's a contract
    return typeIdentifier(definition).match(/^t_type\$_t_contract/) != null;
  }

  //note: only use this on things already verified to be references
  export function referenceType(definition: AstDefinition): string {
    return typeIdentifier(definition).match(/_([^_]+)(_ptr)?$/)[1];
  }

  export function isConstantType(definition: AstDefinition): boolean {
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
            .replace(/_storage(?=_ptr$|$)/, "_" + location)
      }
    };
  }

  //extract the actual numerical value from a node of type rational.
  //currently assumes result will be integer (currently returns BN)
  export function rationalValue(definition: AstDefinition): BN {
    let identifier = typeIdentifier(definition);
    let absoluteValue: string = identifier.match(/_(\d+)_by_1$/)[1];
    let isNegative: boolean = identifier.match(/_minus_/) != null;
    return isNegative? new BN(absoluteValue).neg() : new BN(absoluteValue);
  }
}

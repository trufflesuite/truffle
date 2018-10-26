import { EVM as EVMUtils } from "./evm";
import { AstDefinition } from "./ast";
import cloneDeep from "lodash.clonedeep";

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
        return num / 8;

      case "bytes":
        return num;

      default:
        // debug("Unknown type for size specification: %s", typeIdentifier(definition));
    }
  }

  export function storageSize(definition: AstDefinition, referenceDeclaration?: AstDefinition): number {
    switch (typeClass(definition)) {
      case "bool":
        return 1;

      case "address":
        return 20;

      case "int":
      case "uint": {
        return specifiedSize(definition) || 32; // default of 256 bits
      }

      case "enum": {
        if (referenceDeclaration) {
          const numValues = referenceDeclaration.members.length;
          // numValues <= 2^n - 1
          // numValues + 1 <= 2^n
          // log(numValues + 1) <= n (n is bits)
          return Math.ceil(Math.log2(numValues + 1) / 8);
        }
        else {
          return 0;
        }
      }

      case "bytes": {
        return specifiedSize(definition) || EVMUtils.WORD_SIZE;
      }

      case "string":
      case "bytes":
      case "array":
        return EVMUtils.WORD_SIZE;

      case "struct":
        //

      case "mapping":
        // HACK just to reserve slot. mappings have no size as such
        return EVMUtils.WORD_SIZE;
    }
  }

  export function requireStartOfSlot(definition: AstDefinition): boolean {
    return isArray(definition) || isStruct(definition) || isMapping(definition);
  }

  export function isArray(definition: AstDefinition): boolean {
    return typeIdentifier(definition).match(/^t_array/) != null;
  }

  export function isDynamicArray(definition: AstDefinition): boolean {
    return isArray(definition) && definition.typeName.length === null;
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
    return typeIdentifier(definition).match(/_(memory|storage)(_ptr)?$/) != null;
  }

  export function referenceType(definition: AstDefinition): string {
    return typeIdentifier(definition).match(/_([^_]+)(_ptr)?$/)[1];
  }

  export function baseDefinition(definition: AstDefinition): AstDefinition {
    if (definition.typeName && typeof definition.typeName.baseType === "object") {
      return definition.typeName.baseType;
    }

    let baseIdentifier = typeIdentifier(definition)
      // first dollar sign     last dollar sign
      //   `---------.       ,---'
      .match(/^[^$]+\$_(.+)_\$[^$]+$/)[1]
      //              `----' greedy match

    // HACK - internal types for memory or storage also seem to be pointers
    if (baseIdentifier.match(/_(memory|storage)$/) != null) {
      baseIdentifier = `${baseIdentifier}_ptr`;
    }

    // another HACK - we get away with it becausewe're only using that one property
    let result: AstDefinition = cloneDeep(definition);
    result.typeDescriptions.typeIdentifier = baseIdentifier;
    return result;
  }
}
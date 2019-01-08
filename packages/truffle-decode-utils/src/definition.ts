import { EVM as EVMUtils } from "./evm";
import { AstDefinition } from "./ast";
import { StoragePointer } from "truffle-decoder/lib/types/pointer";
import cloneDeep from "lodash.clonedeep";
import BN from "bn.js";

export namespace Definition {

  export class StorageLength = {
    bytes?: number;
    words?: BN;
    toBytes(): BN {
      if(this.bytes !== undefined)
      {
        return new BN(this.bytes);
      }
      else
      {
        return this.words.muln(EVMUtils.WORD_SIZE);
      }
    }
  };

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

  //TODO: fix all invocations
  export function storageSize(definition: AstDefinition, referenceDeclaration?: AstReferences, referenceVariables?: EvmVariableReferenceMapping): StorageLength {
    switch (typeClass(definition)) {
      case "bool":
        return {bytes: 1};

      case "address":
      case "contract":
        return {bytes: 20};

      case "int":
      case "uint": {
        return {bytes: specifiedSize(definition) || 32 }; // default of 256 bits
        //(should 32 here be WORD_SIZE?  I thought so, but comparing with case
        //of fixed/ufixed makes the appropriate generalization less clear)
      }

      case "fixed":
      case "ufixed": {
        return {bytes: specifiedSize(definition) || 16 }; // default of 128 bits
      }

      case "enum": {
        const referenceId: string = definition.referencedDeclaration;
        const referenceDeclaration: AstDefinition = info.referenceDeclarations[referenceId];
        const numValues: number = referenceDeclaration.members.length;
        return {bytes: Math.ceil(Math.log2(numValues) / 8)};
      }

      case "bytes": {
        //this case is really two different cases!
        const staticSize: number = specifiedSize(definition);
        if(staticSize) {
          return {bytes: staticSize};
        }
        else
        {
          return {words: new BN(1)};
        }
      }

      case "string":
        return {words: new BN(1)};

      case "mapping":
        return {words: new BN(1)};

      case "function":
        //this case is also really two different cases
        switch (visibility(definition)) {
          case "internal":
            return {bytes: 8};
          case "external":
            return {bytes: 24};
        }

      case "array":
        if(isDynamicArray(definition)) {
          return {words: new BN(1)};
        }
        else {
          const length: string = definition.length || definition.typeName.length;
          const baseDefinition: AstDefinition = definition.baseType || definition.typeName.baseType;
          const baseSize: StorageLength = storageSize(baseDefinition, info);
          if(baseSize.bytes !== undefined) {
            const perWord: number = Math.floor(EVMUtils.WORD_SIZE / baseSize.bytes);
            //bn.js has no ceiling-division, so we'll do a floor-division and then
            //increment if not a multiple
            const lengthBN: BN = new BN(length);
            let numWords: BN = lengthBN.divn(perWord); //floor
            if(!lengthBN.modn(perWord).isZero()) {
              numWords.iaddn(1); //increment if not multiple
            }
            return {words: numWords};
          }
          else { //words
            return {words: baseSize.words.mul(new BN(length))};
          }
        }

      case "struct":
        const referenceId: string = definition.referencedDeclaration;
        const allocation: StoragePointer = info.referenceVariables[referenceId].pointer;
        //the size is equal to the last allocated word, plus one
        //(we assume the allocation uses "to" rather than "length", because
        //that's how struct allocations work)
        let size = allocation.storage.to.slot.offset.clone(); //last allocated word...
        size.iaddn(1); //...plus one
        return {words: size};
    }
  }

  export function requireStartOfSlot(definition: AstDefinition): boolean {
    return isArray(definition) || isStruct(definition) || isMapping(definition);
  }

  export function isArray(definition: AstDefinition): boolean {
    return typeIdentifier(definition).match(/^t_array/) != null;
  }

  export function isDynamicArray(definition: AstDefinition): boolean {
    return isArray(definition) && (
      (definition.typeName && definition.typeName.length == null) ||
        definition.length == null
    );
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

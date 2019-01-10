import { EVM as EVMUtils } from "./evm";
import { AstDefinition } from "./ast";
import { StoragePointer } from "truffle-decoder/lib/types/pointer";
import cloneDeep from "lodash.clonedeep";
import BN from "bn.js";

export namespace Definition {

  export interface StorageLength = {
    //use exactly one of these, please, not both
    bytes?: number;
    words?: BN;
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

  //NOTE: This wrapper function is for use by the decoder ONLY, after allocation is done.
  //The allocator should (and does) instead use a direct call to storageSizeAndAllocate,
  //not to the wrapper, because it may need the allocations returned.
  export function storageSize(definition: AstDefinition, referenceDeclarations?: AstReferences, referenceVariables?: EvmVariableReferenceMapping): StorageLength {
    return storageSizeAndAllocate(definition, referenceDeclarations, referenceVariables)[0];
  }

  //first return value is the actual size.
  //second return value is resulting allocations, INCLUDING the ones passed in
  export function storageSizeAndAllocate(definition: AstDefinition, referenceDeclarations?: AstReferences, referenceVariables?: EvmVariableReferenceMapping): [StorageLength, EvmVariableReferenceMapping] {
    let allocations = referenceVariables;
    switch (typeClass(definition)) {
      case "bool":
        return [<StorageLength>{bytes: 1}, allocations];

      case "address":
      case "contract":
        return [<StorageLength>{bytes: 20}, allocations];

      case "int":
      case "uint": {
        return [<StorageLength>{bytes: specifiedSize(definition) || 32 }, allocations]; // default of 256 bits
        //(should 32 here be WORD_SIZE?  I thought so, but comparing with case
        //of fixed/ufixed makes the appropriate generalization less clear)
      }

      case "fixed":
      case "ufixed": {
        return [<StorageLength>{bytes: specifiedSize(definition) || 16 }, allocations]; // default of 128 bits
      }

      case "enum": { //TODO: use recorded size
        const referenceId: string = definition.referencedDeclaration;
        const referenceDeclaration: AstDefinition = info.referenceDeclarations[referenceId];
        const numValues: number = referenceDeclaration.members.length;
        return [<StorageLength>{bytes: Math.ceil(Math.log2(numValues) / 8)}, allocations];
      }

      case "bytes": {
        //this case is really two different cases!
        const staticSize: number = specifiedSize(definition);
        if(staticSize) {
          return [<StorageLength>{bytes: staticSize}, allocations];
        }
        else
        {
          return [<StorageLength>{words: new BN(1)}, allocations];
        }
      }

      case "string":
        return [<StorageLength>{words: new BN(1)}, allocations];

      case "mapping":
        return [<StorageLength>{words: new BN(1)}, allocations];

      case "function": {
        //this case is also really two different cases
        switch (visibility(definition)) {
          case "internal":
            return [<StorageLength>{bytes: 8}, allocations];
          case "external":
            return [<StorageLength>{bytes: 24}, allocations];
        }
      }

      case "array": {
        if(isDynamicArray(definition)) {
          return [<StorageLength>{words: new BN(1)}, allocations];
        }
        else {
          //static array case
          const length: string = definition.length || definition.typeName.length;
          const baseDefinition: AstDefinition = definition.baseType || definition.typeName.baseType;
          const [baseSize, allocations] = storageSizeAndAllocate(baseDefinition, referenceDeclarations, referenceVariables);
            //yes, this is shadowing "allocations" above; that's fine
          if(baseSize.bytes !== undefined) {
            const perWord: number = Math.floor(EVMUtils.WORD_SIZE / baseSize.bytes);
            //bn.js has no ceiling-division, so we'll do a floor-division and then
            //increment if not a multiple
            const lengthBN: BN = new BN(length);
            let numWords: BN = lengthBN.divn(perWord); //floor
            if(!lengthBN.modn(perWord).isZero()) {
              numWords.iaddn(1); //increment if not multiple
            }
            return [<StorageLength>{words: numWords}, allocations];
          }
          else { //words
            return [<StorageLength>{words: baseSize.words.mul(new BN(length))}, allocations];
          }
        }
      }

      case "struct": {
        const referenceId: string = definition.referencedDeclaration;
        let allocation: StoragePointer = info.referenceVariables[referenceId]; //may be undefined!
        if(allocation === undefined) {
          //if we don't find an allocation, we'll have to do the allocation ourselves
          allocations = allocateStruct(definition, referenceDeclarations, referenceVariables); //TODO
          allocation = allocations[referenceId];
          //note that we have altered allocations here
        }
        //having found our allocation, the size is equal to the last allocated
        //word, plus one
        //(we assume the allocation uses "to" rather than "length", because
        //that's how struct allocations work)
        let length = allocation.pointer.storage.to.slot.offset.addn(1); //last allocated word, plus one
        return [<StorageLength>{words: length}, allocations];
      }
    }
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

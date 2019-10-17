import debugModule from "debug";
const debug = debugModule("codec:allocate:storage");

import { StoragePointer } from "../types/pointer";
import { StorageAllocations, StorageAllocation, StorageMemberAllocation } from "../types/allocation";
import { StorageLength, Range } from "../types/storage";
import { isWordsLength } from "../utils/storage";
import { UnknownUserDefinedTypeError } from "../types/errors";
import { DecodingError } from "../decode/errors";
import { AstDefinition, AstReferences } from "../types/ast";
import * as CodecUtils from "../utils";
import { TypeUtils } from "../utils";
import * as Format from "../format";
import BN from "bn.js";

export class UnknownBaseContractIdError extends Error {
  public derivedId: number;
  public derivedName: string;
  public derivedKind: string;
  public baseId: number;
  constructor(derivedId: number, derivedName: string, derivedKind: string, baseId: number) {
    const message = `Cannot locate base contract ID ${baseId} of ${derivedKind} ${derivedName} (ID ${derivedId})`;
    super(message);
    this.name = "UnknownBaseContractIdError";
    this.derivedId = derivedId;
    this.derivedName = derivedName;
    this.derivedKind = derivedKind;
    this.baseId = baseId;
  }
}

interface StorageAllocationInfo {
  size: StorageLength;
  allocations: StorageAllocations;
}

interface DefinitionPair {
  definition: AstDefinition;
  definedIn?: AstDefinition;
}

//contracts contains only the contracts to be allocated; any base classes not
//being allocated should just be in referenceDeclarations
export function getStorageAllocations(referenceDeclarations: AstReferences, contracts: AstReferences, existingAllocations: StorageAllocations = {}): StorageAllocations {
  let allocations = existingAllocations;
  for(const node of Object.values(referenceDeclarations)) {
    if(node.nodeType === "StructDefinition") {
      try {
        allocations = allocateStruct(node, referenceDeclarations, allocations);
      }
      catch(_) {
        //if allocation fails... oh well, allocation fails, we do nothing and just move on :P
        //note: a better way of handling this would probably be to *mark* it
        //as failed rather than throwing an exception as that would lead to less
        //recomputation, but this is simpler and I don't think the recomputation
        //should really be a problem
      }
    }
  }
  for(const contract of Object.values(contracts)) {
    try {
      allocations = allocateContract(contract, referenceDeclarations, allocations);
    }
    catch(_) {
      //similarly, we'll allow failure here too, and catch the problem elsewhere
    }
  }
  return allocations;
}

function allocateStruct(structDefinition: AstDefinition, referenceDeclarations: AstReferences, existingAllocations: StorageAllocations): StorageAllocations {
  let members = structDefinition.members.map(
    definition => ({definition})
  );
  return allocateMembers(structDefinition, members, referenceDeclarations, existingAllocations);
}

function allocateMembers(parentNode: AstDefinition, definitions: DefinitionPair[], referenceDeclarations: AstReferences, existingAllocations: StorageAllocations, suppressSize: boolean = false): StorageAllocations {
  let offset: number = 0; //will convert to BN when placing in slot
  let index: number = CodecUtils.EVM.WORD_SIZE - 1;

  //don't allocate things that have already been allocated
  if(parentNode.id in existingAllocations) {
    return existingAllocations;
  }

  let allocations = {...existingAllocations}; //otherwise, we'll be adding to this, so we better clone

  //otherwise, we need to allocate
  let memberAllocations: StorageMemberAllocation[] = []

  for(const {definition: node, definedIn} of definitions)
  {

    //first off: is this a constant? if so we use a different, simpler process
    if(node.constant) {
      let pointer = { location: "definition" as "definition", definition: node.value };
      //HACK restrict ourselves to the types of constants we know how to handle
      if(CodecUtils.Definition.isSimpleConstant(node.value)) {
        memberAllocations.push({definition: node, pointer});
      }
      //if we don't know how to handle it, we just ignore it
      continue;
    }

    let size: StorageLength;
    ({size, allocations} = storageSizeAndAllocate(node, referenceDeclarations, allocations));

    //if it's sized in words (and we're not at the start of slot) we need to start on a new slot
    //if it's sized in bytes but there's not enough room, we also need a new slot
    if ( isWordsLength(size)
      ? index < CodecUtils.EVM.WORD_SIZE - 1
      : size.bytes > index + 1) {
        index = CodecUtils.EVM.WORD_SIZE - 1;
        offset += 1;
    }
    //otherwise, we remain in place

    let range: Range;

    if(isWordsLength(size)) {
      //words case
      range = {
        from: {
          slot: {
            offset: new BN(offset) //start at the current slot...
          },
          index: 0 //...at the beginning of the word.
        },
        to: {
          slot: {
            offset: new BN(offset + size.words - 1) //end at the current slot plus # of words minus 1...
          },
          index: CodecUtils.EVM.WORD_SIZE - 1 //...at the end of the word.
        },
      };
    }
    else {
      //bytes case
      range = {
        from: {
          slot: {
            offset: new BN(offset) //start at the current slot...
          },
          index: index - (size.bytes - 1) //...early enough to fit what's being allocated.
        },
        to: {
          slot: {
            offset: new BN(offset) //end at the current slot...
          },
          index: index //...at the current position.
        },
      };
    }
    memberAllocations.push({
      definition: node,
      definedIn,
      pointer: {
        location: "storage",
        range
      }
    });
    //finally, adjust the current position.
    //if it was sized in words, move down that many slots and reset position w/in slot
    if(isWordsLength(size)) {
      offset += size.words;
      index = CodecUtils.EVM.WORD_SIZE - 1;
    }
    //if it was sized in bytes, move down an appropriate number of bytes.
    else {
      index -= size.bytes;
      //but if this puts us into the next word, move to the next word.
      if(index < 0) {
        index = CodecUtils.EVM.WORD_SIZE - 1;
        offset += 1;
      }
    }
  }

  //having made our allocation, let's add it to allocations!
  allocations[parentNode.id] = {
    definition: parentNode,
    members: memberAllocations
  };

  //finally, let's determine the overall size (unless suppressSize was passed)
  //we do this assuming we're dealing with a struct, so the size is measured in words
  //it's one plus the last word used, i.e. one plus the current word... unless the
  //current word remains entirely unused, then it's just the current word
  //SPECIAL CASE: if *nothing* has been used, allocate a single word (that's how
  //empty structs behave in versions where they're legal)
  if(!suppressSize) {
    if(index === CodecUtils.EVM.WORD_SIZE - 1 && offset !== 0) {
      allocations[parentNode.id].size = {words: offset};
    }
    else {
      allocations[parentNode.id].size = {words: offset + 1};
    }
  }

  //...and we're done!
  return allocations;
}

function getStateVariables(contractNode: AstDefinition): AstDefinition[] {
  // process for state variables
  return contractNode.nodes.filter( (node: AstDefinition) =>
    node.nodeType === "VariableDeclaration" && node.stateVariable
  );
}

function allocateContract(contract: AstDefinition, referenceDeclarations: AstReferences, existingAllocations: StorageAllocations): StorageAllocations {

  let allocations: StorageAllocations = {...existingAllocations};

  //base contracts are listed from most derived to most base, so we
  //have to reverse before processing, but reverse() is in place, so we
  //clone with slice first
  let linearizedBaseContractsFromBase: number[] = contract.linearizedBaseContracts.slice().reverse();

  let vars = [].concat(...linearizedBaseContractsFromBase.map( (id: number) => {
    let baseNode = referenceDeclarations[id];
    if(baseNode === undefined) {
      throw new UnknownBaseContractIdError(contract.id, contract.name, contract.contractKind, id);
    }
    return getStateVariables(baseNode).map(
      definition => ({
        definition,
        definedIn: baseNode
      })
    );
  }));

  return allocateMembers(contract, vars, referenceDeclarations, existingAllocations, true);
    //size is not meaningful for contracts, so we pass suppressSize=true
}

//NOTE: This wrapper function is for use by the decoder ONLY, after allocation is done.
//The allocator should (and does) instead use a direct call to storageSizeAndAllocate,
//not to the wrapper, because it may need the allocations returned.
export function storageSize(definition: AstDefinition, referenceDeclarations?: AstReferences, allocations?: StorageAllocations): StorageLength {
  return storageSizeAndAllocate(definition, referenceDeclarations, allocations).size;
}

function storageSizeAndAllocate(definition: AstDefinition, referenceDeclarations?: AstReferences, existingAllocations?: StorageAllocations): StorageAllocationInfo {
  switch (CodecUtils.Definition.typeClass(definition)) {
    case "bool":
      return {
        size: {bytes: 1},
        allocations: existingAllocations
      };

    case "address":
    case "contract":
      return {
        size: {bytes: CodecUtils.EVM.ADDRESS_SIZE},
        allocations: existingAllocations
      };

    case "int":
    case "uint":
      return {
        size: {bytes: CodecUtils.Definition.specifiedSize(definition) || 32 }, // default of 256 bits
        //(should 32 here be WORD_SIZE?  I thought so, but comparing with case
        //of fixed/ufixed makes the appropriate generalization less clear)
        allocations: existingAllocations
      };

    case "fixed":
    case "ufixed":
      return {
        size: {bytes: CodecUtils.Definition.specifiedSize(definition) || 16 }, // default of 128 bits
        allocations: existingAllocations
      };

    case "enum": {
      debug("enum definition %O", definition);
      const referenceId: number = CodecUtils.Definition.typeId(definition);
        //note: we use the preexisting function here for convenience, but we
        //should never need to worry about faked-up enum definitions, so just
        //checking the referencedDeclaration field would also work
      const referenceDeclaration: AstDefinition = referenceDeclarations[referenceId];
      if(referenceDeclaration === undefined) {
        let typeString = CodecUtils.Definition.typeString(definition);
        throw new UnknownUserDefinedTypeError(referenceId.toString(), typeString);
      }
      const numValues: number = referenceDeclaration.members.length;
      return {
        size: {bytes: Math.ceil(Math.log2(numValues) / 8)},
        allocations: existingAllocations
      };
    }

    case "bytes": {
      //this case is really two different cases!
      const staticSize: number = CodecUtils.Definition.specifiedSize(definition);
      if(staticSize) {
        return {
          size: {bytes: staticSize},
          allocations: existingAllocations
        };
      }
      else
      {
        return {
          size: {words: 1},
          allocations: existingAllocations
        };
      }
    }

    case "string":
    case "mapping":
      return {
        size: {words: 1},
        allocations: existingAllocations
      };

    case "function": {
      //this case is also really two different cases
      switch (CodecUtils.Definition.visibility(definition)) {
        case "internal":
          return {
            size: {bytes: CodecUtils.EVM.PC_SIZE * 2},
            allocations: existingAllocations
          };
        case "external":
          return {
            size: {bytes: CodecUtils.EVM.ADDRESS_SIZE + CodecUtils.EVM.SELECTOR_SIZE},
            allocations: existingAllocations
          };
      }
    }

    case "array": {
      if(CodecUtils.Definition.isDynamicArray(definition)) {
        return {
          size: {words: 1},
          allocations: existingAllocations
        };
      }
      else {
        //static array case
        const length: number = CodecUtils.Definition.staticLength(definition);
        if(length === 0) {
          //in versions of Solidity where it's legal, arrays of length 0 still take up 1 word
          return {
            size: {words: 1},
            allocations: existingAllocations
          };
        }
        const baseDefinition: AstDefinition = CodecUtils.Definition.baseDefinition(definition);
        const {size: baseSize, allocations} = storageSizeAndAllocate(baseDefinition, referenceDeclarations, existingAllocations);
        if(!isWordsLength(baseSize)) {
          //bytes case
          const perWord: number = Math.floor(CodecUtils.EVM.WORD_SIZE / baseSize.bytes);
          debug("length %o", length);
          const numWords: number = Math.ceil(length / perWord);
          return {
            size: {words: numWords},
            allocations
          };
        }
        else {
          //words case
          return {
            size: {words: baseSize.words * length},
            allocations
          };
        }
      }
    }

    case "struct": {
      const referenceId: number = CodecUtils.Definition.typeId(definition);
      let allocations: StorageAllocations = existingAllocations;
      let allocation: StorageAllocation | undefined = allocations[referenceId]; //may be undefined!
      if(allocation === undefined) {
        //if we don't find an allocation, we'll have to do the allocation ourselves
        const referenceDeclaration: AstDefinition = referenceDeclarations[referenceId];
        if(referenceDeclaration === undefined) {
          let typeString = CodecUtils.Definition.typeString(definition);
          throw new UnknownUserDefinedTypeError(referenceId.toString(), typeString);
        }
        debug("definition %O", definition);
        allocations = allocateStruct(referenceDeclaration, referenceDeclarations, existingAllocations);
        allocation = allocations[referenceId];
      }
      //having found our allocation, we can just look up its size
      return {
        size: allocation.size,
        allocations
      };
    }
  }
}

//like storageSize, but for a Type object; also assumes you've already done allocation
export function storageSizeForType(dataType: Format.Types.Type, userDefinedTypes?: Format.Types.TypesById, allocations?: StorageAllocations): StorageLength {
  switch(dataType.typeClass) {
    case "bool":
      return {bytes: 1};
    case "address":
    case "contract":
      return {bytes: CodecUtils.EVM.ADDRESS_SIZE};
    case "int":
    case "uint":
    case "fixed":
    case "ufixed":
      return {bytes: dataType.bits / 8 };
    case "enum": {
      let fullType = <Format.Types.EnumType>TypeUtils.fullType(dataType, userDefinedTypes);
      if(!fullType.options) {
        throw new DecodingError(
          {
            kind: "UserDefinedTypeNotFoundError",
            type: dataType
          }
        );
      }
      return {bytes: Math.ceil(Math.log2(fullType.options.length) / 8)};
    }
    case "function":
      switch (dataType.visibility) {
        case "internal":
          return {bytes: CodecUtils.EVM.PC_SIZE * 2};
        case "external":
          return {bytes: CodecUtils.EVM.ADDRESS_SIZE + CodecUtils.EVM.SELECTOR_SIZE};
      }
      break; //to satisfy typescript :P
    case "bytes":
      switch(dataType.kind) {
        case "static":
          return {bytes: dataType.length};
        case "dynamic":
          return {words: 1};
      }
    case "string":
    case "mapping":
      return {words: 1};
    case "array": {
      switch(dataType.kind) {
        case "dynamic":
          return {words: 1};
        case "static":
          let length = dataType.length.toNumber(); //warning! but if it's too big we have a problem
          if(length === 0) {
            return {words: 1};
          }
          let baseSize = storageSizeForType(dataType.baseType, userDefinedTypes, allocations);
          if(!isWordsLength(baseSize)) {
            //bytes case
            const perWord: number = Math.floor(CodecUtils.EVM.WORD_SIZE / baseSize.bytes);
            debug("length %o", length);
            const numWords: number = Math.ceil(length / perWord);
            return {words: numWords};
          }
          else {
            return {words: baseSize.words * length};
          }
        }
      }
    case "struct":
      let allocation = allocations[parseInt(dataType.id)];
      if(!allocation) {
        throw new DecodingError(
          {
            kind: "UserDefinedTypeNotFoundError",
            type: dataType
          }
        );
      }
      return allocation.size;
  }
}

import debugModule from "debug";
const debug = debugModule("decoder:allocate:storage");

import { StoragePointer } from "../types/pointer";
import { StorageAllocations, StorageAllocation, StorageMemberAllocations } from "../types/allocation";
import { StorageLength, isWordsLength, Range } from "../types/storage";
import { UnknownBaseContractIdError, UnknownUserDefinedTypeError } from "../types/errors";
import { AstDefinition, AstReferences } from "truffle-decode-utils";
import { readDefinition } from "../read/constant"
import * as DecodeUtils from "truffle-decode-utils";
import BN from "bn.js";

//contracts contains only the contracts to be allocated; any base classes not
//being allocated should just be in referenceDeclarations
export function getStorageAllocations(referenceDeclarations: AstReferences, contracts: AstReferences): StorageAllocations {
  let allocations: StorageAllocations = {};
  for(const node of Object.values(referenceDeclarations)) {
    if(node.nodeType === "StructDefinition") {
      allocations = allocateStruct(node, referenceDeclarations, allocations);
    }
  }
  for(const contract of Object.values(contracts)) {
    allocations = allocateContract(contract, referenceDeclarations, allocations);
  }
  return allocations;
}

function allocateStruct(structDefinition: AstDefinition, referenceDeclarations: AstReferences, existingAllocations: StorageAllocations): StorageAllocations {
  return allocateMembers(structDefinition, structDefinition.members, referenceDeclarations, existingAllocations);
}

function allocateMembers(parentNode: AstDefinition, definitions: AstDefinition[], referenceDeclarations: AstReferences, existingAllocations: StorageAllocations, suppressSize: boolean = false): StorageAllocations {
  let offset: number = 0; //will convert to BN when placing in slot
  let index: number = DecodeUtils.EVM.WORD_SIZE - 1;

  //don't allocate things that have already been allocated
  if(parentNode.id in existingAllocations) {
    return existingAllocations;
  }

  let allocations = {...existingAllocations}; //otherwise, we'll be adding to this, so we better clone

  //otherwise, we need to allocate
  let memberAllocations: StorageMemberAllocations = {}

  for(const node of definitions)
  {

    //first off: is this a constant? if so we use a different, simpler process
    if(node.constant) {
      let pointer = { definition: node.value };
      //HACK restrict ourselves to the types of constants we know how to handle
      if(DecodeUtils.Definition.isSimpleConstant(node.value)) {
        memberAllocations[node.id] = {
          definition: node,
          pointer
        };
      }
      //if we don't know how to handle it, we just ignore it
      continue;
    }

    let size: StorageLength;
    [size, allocations] = storageSizeAndAllocate(node, referenceDeclarations, allocations);

    //if it's sized in words (and we're not at the start of slot) we need to start on a new slot
    //if it's sized in bytes but there's not enough room, we also need a new slot
    if ( isWordsLength(size)
      ? index < DecodeUtils.EVM.WORD_SIZE - 1
      : size.bytes > index + 1) {
        index = DecodeUtils.EVM.WORD_SIZE - 1;
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
          index: DecodeUtils.EVM.WORD_SIZE - 1 //...at the end of the word.
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
  
    memberAllocations[node.id] = {
      definition: node,
      pointer: {
        storage: range
      }
    };
  
    //finally, adjust the current position.
    //if it was sized in words, move down that many slots and reset position w/in slot
    if(isWordsLength(size)) {
      offset += size.words;
      index = DecodeUtils.EVM.WORD_SIZE - 1;
    }
    //if it was sized in bytes, move down an appropriate number of bytes.
    else {
      index -= size.bytes;
      //but if this puts us into the next word, move to the next word.
      if(index < 0) {
        index = DecodeUtils.EVM.WORD_SIZE - 1;
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
    if(index === DecodeUtils.EVM.WORD_SIZE - 1 && offset !== 0) {
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
    return getStateVariables(baseNode);
  }));

  return allocateMembers(contract, vars, referenceDeclarations, existingAllocations, true); 
    //size is not meaningful for contracts, so we pass suppressSize=true
}

//NOTE: This wrapper function is for use by the decoder ONLY, after allocation is done.
//The allocator should (and does) instead use a direct call to storageSizeAndAllocate,
//not to the wrapper, because it may need the allocations returned.
export function storageSize(definition: AstDefinition, referenceDeclarations?: AstReferences, allocations?: StorageAllocations): StorageLength {
  return storageSizeAndAllocate(definition, referenceDeclarations, allocations)[0];
}

//first return value is the actual size.
//second return value is resulting allocations, INCLUDING the ones passed in
function storageSizeAndAllocate(definition: AstDefinition, referenceDeclarations?: AstReferences, existingAllocations?: StorageAllocations): [StorageLength, StorageAllocations] {
  switch (DecodeUtils.Definition.typeClass(definition)) {
    case "bool":
      return [{bytes: 1}, existingAllocations];

    case "address":
    case "contract":
      return [{bytes: DecodeUtils.EVM.ADDRESS_SIZE}, existingAllocations];

    case "int":
    case "uint": {
      return [{bytes: DecodeUtils.Definition.specifiedSize(definition) || 32 }, existingAllocations]; // default of 256 bits
      //(should 32 here be WORD_SIZE?  I thought so, but comparing with case
      //of fixed/ufixed makes the appropriate generalization less clear)
    }

    case "fixed":
    case "ufixed": {
      return [{bytes: DecodeUtils.Definition.specifiedSize(definition) || 16 }, existingAllocations]; // default of 128 bits
    }

    case "enum": {
      debug("enum definition %O", definition);
      const referenceId: number = DecodeUtils.Definition.typeId(definition);
        //note: we use the preexisting function here for convenience, but we
        //should never need to worry about faked-up enum definitions, so just
        //checking the referencedDeclaration field would also work
      const referenceDeclaration: AstDefinition = referenceDeclarations[referenceId];
      if(referenceDeclaration === undefined) {
        let typeString = DecodeUtils.Definition.typeString(definition);
        throw new UnknownUserDefinedTypeError(referenceId, typeString);
      }
      const numValues: number = referenceDeclaration.members.length;
      return [{bytes: Math.ceil(Math.log2(numValues) / 8)}, existingAllocations];
    }

    case "bytes": {
      //this case is really two different cases!
      const staticSize: number = DecodeUtils.Definition.specifiedSize(definition);
      if(staticSize) {
        return [{bytes: staticSize}, existingAllocations];
      }
      else
      {
        return [{words: 1}, existingAllocations];
      }
    }

    case "string":
      return [{words: 1}, existingAllocations];

    case "mapping":
      return [{words: 1}, existingAllocations];

    case "function": {
      //this case is also really two different cases
      switch (DecodeUtils.Definition.visibility(definition)) {
        case "internal":
          return [{bytes: DecodeUtils.EVM.PC_SIZE * 2}, existingAllocations];
        case "external":
          return [{bytes: DecodeUtils.EVM.ADDRESS_SIZE + DecodeUtils.EVM.SELECTOR_SIZE}, existingAllocations];
      }
    }

    case "array": {
      if(DecodeUtils.Definition.isDynamicArray(definition)) {
        return [{words: 1}, existingAllocations];
      }
      else {
        //static array case
        const length: number = DecodeUtils.Definition.staticLength(definition);
        if(length === 0) {
          //in versions of Solidity where it's legal, arrays of length 0 still take up 1 word
          return [{words: 1}, existingAllocations];
        }
        const baseDefinition: AstDefinition = DecodeUtils.Definition.baseDefinition(definition);
        const [baseSize, allocations] = storageSizeAndAllocate(baseDefinition, referenceDeclarations, existingAllocations);
        if(!isWordsLength(baseSize)) {
          //bytes case
          const perWord: number = Math.floor(DecodeUtils.EVM.WORD_SIZE / baseSize.bytes);
          debug("length %o", length);
          const numWords: number = Math.ceil(length / perWord);
          return [{words: numWords}, allocations];
        }
        else {
          //words case
          return [{words: baseSize.words * length}, allocations];
        }
      }
    }

    case "struct": {
      const referenceId: number = DecodeUtils.Definition.typeId(definition);
      let allocations: StorageAllocations = existingAllocations;
      let allocation: StorageAllocation | undefined = allocations[referenceId]; //may be undefined!
      if(allocation === undefined) {
        //if we don't find an allocation, we'll have to do the allocation ourselves
        const referenceDeclaration: AstDefinition = referenceDeclarations[referenceId];
        if(referenceDeclaration === undefined) {
          let typeString = DecodeUtils.Definition.typeString(definition);
          throw new UnknownUserDefinedTypeError(referenceId, typeString);
        }
        debug("definition %O", definition);
        allocations = allocateStruct(referenceDeclaration, referenceDeclarations, existingAllocations);
        allocation = allocations[referenceId];
      }
      //having found our allocation, we can just look up its size
      return [allocation.size, allocations];
    }
  }
}

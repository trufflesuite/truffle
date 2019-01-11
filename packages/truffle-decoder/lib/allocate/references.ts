import { EvmVariableReferenceMapping, AstReferences, ContractMapping, getContractNode, ContractStateVariable } from "../interface/contract-decoder";
import { ContractObject } from "truffle-contract-schema/spec";
import { StoragePointer } from "../types/pointer";
import { AstDefinition } from "truffle-decode-utils/src/ast";
import merge from "lodash.merge";
import cloneDeep from "lodash.clonedeep";
import * as DecodeUtils from "truffle-decode-utils";
import BN from "bn.js";

function getDeclarationsForTypes(contracts: ContractObject[], types: string[]): AstReferences {
  let result: AstReferences = {};

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];
    const contractNode = getContractNode(contract);
    if (contractNode) {
      for (let k = 0; k < contractNode.nodes.length; k++) {
        const node = contractNode.nodes[k];
        if (types.indexOf(node.nodeType) >= 0) {
          result[node.id] = node;
        }
      }
    }
  }

  return result;
}

//split this function in two
export function getReferenceDeclarations(contracts: ContractObject[]): AstReferences {
  const types = [
    "EnumDefinition",
    "StructDefinition"
  ];

  return getDeclarationsForTypes(contracts, types);
}

export function getAllocations(referenceDeclarations, contracts: AstDefinitions[]): StorageAllocations {
  allocations: StorageAllocations = {};
  for(node of referenceDeclarations) {
    if(node.nodeType === "StructDefinition")
      allocations = allocateStruct(node, referenceDeclarations, allocations);
  }
  for(contract of contracts) {
    allocations = allocateContract(contract, referenceDeclarations, allocations);
  }
  return allocations;
}

export function getEventDefinitions(contracts: ContractObject[]): AstReferences {
  const types = [
    "EventDefinition"
  ];

  return getDeclarationsForTypes(contracts, types);
}

export function allocateStruct(structDefinition: AstDefinition, referenceDeclarations: AstReferences, existingAllocations: StorageAllocations): StorageAllocations {
  return allocateDefinitions(structDefinition, structDefinition.members, referenceDeclarations, existingAllocations);
}

export function allocateDefinitions(parentNode: AstDefinition, definitions: AstDefinition[], referenceDeclarations: AstReferences, existingAllocations: StorageAllocations): StorageAllocations {
  let offset = new BN(0);
  let index = DecodeUtils.EVM.WORD_SIZE - 1;
  let allocations = {...existingAllocations}; //we'll be adding to this, so we better clone

  //don't allocate things that have already been allocated
  if(parentNode.id in allocations) {
    return allocations;
  }

  //otherwise, we need to allocate
  let memberAllocations: StorageMemberAllocations = {}

  for(node of definitions)
  {
    //note: in the future, we will begin by checking if node is constant
    //and if so doing things a different way to allocate a literal for it
    let size: StorageLength;
    [size, allocations] = storageSizeAndAllocation(node, referenceDeclarations, allocations);

    if (size.words !== undefined || size.bytes < index + 1) {
      //if it's sized in words, we need to start on a new slot;
      //if it's sized in bytes but there's not enough room, we also need a new slot
      index = DecodeUtils.EVM.WORD_SIZE - 1;
      offset.iaddn(1);
    }
    //otherwise, we remain in place
  
    let range: Allocation.Range;

    if(size.words !== undefined) {
      //words case
      range.from.slot = <Slot>{offset: offset.clone()}; //start at the current slot...
      range.from.index = 0; //...at the beginning fo the word.
      range.to.slot = <Slot>{offset: offset.add(size.words).subn(1)}; //end at the current slot plus # of words minus 1...
      range.to.index = DecodeUtils.EVM.WORD_SIZE - 1; //...at the end of the word.
    }
    else {
      //bytes case
      range.from.slot = <Slot>{offset: offset.clone()}; //start at the current slot...
      range.to.slot = <Slot>{offset: offset.clone()}; //...and end in the current slot.
      range.to.index = index; //end at the current index...
      range.from.index = index - size.bytes; //...and start appropriately earlier in the slot.
    }
  
    memberAllocations[node.id] = <ContractStateVariable>{
      definition: node,
      pointer: <StoragePointer>{
        storage: range; //don't think we need to clone here...
      }
    };
  
    //finally, adjust the current position.
    //if it was sized in words, move down that many slots and reset position w/in slot
    if(size.words !== undefined) {
      offset.iadd(size.words);
      index = DecodeUtils.EVM.WORD_SIZE - 1;
    }
    //if it was sized in bytes, move down an appropriate number of bytes.
    else {
      index -= size.bytes;
      //but if this puts us into the next word, move to the next word.
      if(index < 0) {
        index = DecodeUtils.EVM.WORD_SIZE - 1;
        offset.iaddn(1);
      }
    }
  }

  //finally, let's set up a pointer describing the overall structure itself
  //(this is only really meaningful for structs, not contracts, but whatever)

  //for this, we need to know, what's the last word used?  normally this is just offset,
  //but it's possible we haven't used any of that word, in which case it's one lower
  if(index === DecodeUtils.EVM.WORD_SIZE - 1) {
    offset.isubn(1);
  }
  
  //put it all together...
  let wholePointer = <StoragePointer>{
    storage: {
      from: {
        slot: {
          offset: new BN(0)
        },
        index: 0
      },
      to: {
        slot: {
          offset: offset.clone()
        },
        index: DecodeUtils.EVM.WORD_SIZE - 1;
      }
    }
  }

  //stick in allocations...
  allocations[parentNode.id] = <ContractStateVariable>{
    definition: parentNode,
    pointer: wholePointer,
    members: memberAllocations
  }

  //...and we're done!
  return allocations;
}

function getStateVariables(contract: ContractObject): AstDefinition[] {
  // process for state variables, filtering out constants
  const contractNode = getContractNode(contract); //ARGH TODO
  return contractNode.nodes.filter( (node) =>
    node.nodeType === "VariableDeclaration" && node.stateVariable && !node.constant
  );
  //note, in the future, we will not filter out constants
}

export function allocateContract(contract: AstDefinition, contracts: ContractMapping, referenceDeclarations: AstReferences, existingAllocations: StorageAllocations): StorageAllocations {

  let allocations: StorageAllocations = {...existingAllocations};

  //base contracts are listed from most derived to most base, so we
  //have to reverse before processing, but reverse() is in place, so we
  //clone first
  let linearizedBaseContractsFromBase = [...contract.linearizedBaseContracts].reverse();

  let vars = [].concat(...linearizedBaseContractsFromBase.map( (id) =>
    getStateVariables(contracts[id]) //TODO fix this to use AstDefition, not ContractObject
  ));

  return allocateDefinitions(contract, vars, referenceDeclarations, existingAllocations);
}

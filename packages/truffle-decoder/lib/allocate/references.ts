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

export function getReferenceDeclarations(contracts: ContractObject[]): AstReferences {
  const types = [
    "EnumDefinition",
    "StructDefinition"
  ];

  return getDeclarationsForTypes(contracts, types);
}

//referenceDeclarations: all structs to be allocated
//contracts: all contracts to be allocated
//referenceContracts: any contracts you *don't* want to be allocated but need
//anyway because they're inherited by something you do want allocated
export function getAllocations(referenceDeclarations: AstReferences, contracts: AstReferences, referenceContracts: AstReferences): StorageAllocations {
  allocations: StorageAllocations = {};
  for(node of referenceDeclarations) {
    if(node.nodeType === "StructDefinition")
      allocations = allocateStruct(node, referenceDeclarations, allocations);
  }
  for(contract of contracts) {
    allocations = allocateContract(contract, referenceDeclarations, allocations, referenceContracts);
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
  return allocateMembers(structDefinition, structDefinition.members, referenceDeclarations, existingAllocations);
}

export function allocateMembers(parentNode: AstDefinition, definitions: AstDefinition[], referenceDeclarations: AstReferences, existingAllocations: StorageAllocations, suppressSize: boolean = false): StorageAllocations {
  let offset = new BN(0);
  let index = DecodeUtils.EVM.WORD_SIZE - 1;

  //don't allocate things that have already been allocated
  if(parentNode.id in allocations) {
    return allocations;
  }

  let allocations = {...existingAllocations}; //otherwise, we'll be adding to this, so we better clone

  //otherwise, we need to allocate
  let memberAllocations: StorageMemberAllocations = {}

  for(node of definitions)
  {
    //note: in the future, we will begin by checking if node is constant
    //and if so doing things a different way to allocate a literal for it
    let size: StorageLength;
    [size, allocations] = storageSizeAndAllocation(node, referenceDeclarations, allocations);

    if (isWordsLength(size) || size.bytes < index + 1) {
      //if it's sized in words, we need to start on a new slot;
      //if it's sized in bytes but there's not enough room, we also need a new slot
      index = DecodeUtils.EVM.WORD_SIZE - 1;
      offset.iaddn(1);
    }
    //otherwise, we remain in place
  
    let range: Allocation.Range;

    if(isWordsLength(size)) {
      //words case
      range.from.slot = {offset: offset.clone()}; //start at the current slot...
      range.from.index = 0; //...at the beginning fo the word.
      range.to.slot = {offset: offset.add(size.words).subn(1)}; //end at the current slot plus # of words minus 1...
      range.to.index = DecodeUtils.EVM.WORD_SIZE - 1; //...at the end of the word.
    }
    else {
      //bytes case
      range.from.slot = {offset: offset.clone()}; //start at the current slot...
      range.to.slot = {offset: offset.clone()}; //...and end in the current slot.
      range.to.index = index; //end at the current index...
      range.from.index = index - size.bytes; //...and start appropriately earlier in the slot.
    }
  
    memberAllocations[node.id] = {
      definition: node,
      pointer: {
        storage: range; //don't think we need to clone here...
      }
    };
  
    //finally, adjust the current position.
    //if it was sized in words, move down that many slots and reset position w/in slot
    if(isWordsLength(size)) {
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

  //having made our allocation, let's add it to allocations!
  allocations[parentNode.id] = {
    definition: parentNode,
    members: memberAllocations
  };

  //finally, let's determine the overall size (unless suppressSize was passed)
  //we do this assuming we're dealing with a struct, so the size is measured in words
  //it's one plus the last word used, i.e. one plus the current word... unless the
  //current word remains entirely unused, then it's just the current word
  if(!suppressSize) {
    allocations[parentNode.id].size = (index === DecodeUtils.EVM.WORD_SIZE - 1) ?
      offset.clone() : offset.addn(1);
  }

  //...and we're done!
  return allocations;
}

function getStateVariables(contractNode: AstDefinition): AstDefinition[] {
  // process for state variables, filtering out constants
  return contractNode.nodes.filter( (node) =>
    node.nodeType === "VariableDeclaration" && node.stateVariable && !node.constant
  );
  //note, in the future, we will not filter out constants
}

export function allocateContract(contract: AstDefinition, referenceDeclarations: AstReferences, existingAllocations: StorageAllocations, contracts: AstReferences): StorageAllocations {

  let allocations: StorageAllocations = {...existingAllocations};

  //base contracts are listed from most derived to most base, so we
  //have to reverse before processing, but reverse() is in place, so we
  //clone first
  let linearizedBaseContractsFromBase = [...contract.linearizedBaseContracts].reverse();

  let vars = [].concat(...linearizedBaseContractsFromBase.map( (id) =>
    getStateVariables(contracts[id])
  ));

  return allocateMembers(contract, vars, referenceDeclarations, existingAllocations, true); 
    //size is not meaningful for contracts, so we pass suppressSize=true
}

import { EvmVariableReferenceMapping, AstReferences, ContractMapping, getContractNode, ContractStateVariable } from "../interface/contract-decoder";
import { ContractObject } from "truffle-contract-schema/spec";
import { StoragePointer } from "../types/pointer";
import { AstDefinition } from "truffle-decode-utils/src/ast";
import merge from "lodash.merge";
import cloneDeep from "lodash.clonedeep";
import * as DecodeUtils from "truffle-decode-utils";
import BN from "bn.js";

interface SlotAllocation {
  offset: BN;
  index: number;
};

export interface ContractStateInfo {
  variables: EvmVariableReferenceMapping;
  slot: SlotAllocation;
}

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

export function getReferenceDeclarations(contracts: ContractObject[]): [AstReferences, EvmVariableReferenceMapping] {
  let result: EvmVariableReferenceMapping = {};
  const types = [
    "EnumDefinition",
    "StructDefinition"
  ];

  const referenceDeclarations = getDeclarationsForTypes(contracts, types);

  Object.entries(referenceDeclarations).forEach((entry) => {
    const id = parseInt(entry[0]);
    const definition: DecodeUtils.AstDefinition = entry[1];

    result[id] = <ContractStateVariable>{
      definition: definition,
      isChildVariable: false
    };

    switch (definition.nodeType) {
      case "EnumDefinition": {
        // do nothing, doesn't need a pointer
        break;
      }
      case "StructDefinition": {
        const stateInfo = allocateStruct(definition, referenceDeclarations, <DecodeUtils.Allocation.Slot>{
          offset: new BN(0)
        });
        result[id].members = stateInfo.variables;
      }
    }
  });

  return [referenceDeclarations, result];
}

export function getEventDefinitions(contracts: ContractObject[]): AstReferences {
  const types = [
    "EventDefinition"
  ];

  return getDeclarationsForTypes(contracts, types);
}

export function allocateStruct(structDefinition: AstDefinition, referenceDeclarations: AstReferences, existingAllocations: EvmVariableReferenceMapping) {
  return allocateDefinitions(structDefinition, structDefinition.members, referenceDeclarations, existingAllocations);
}

export function allocateDefinitions(parentNode: AstDefinition, definitions: [AstDefinition], referenceDeclarations: AstReferences, existingAllocations: EvmVariableReferenceMapping) {
  let offset = new BN(0);
  let index = DecodeUtils.EVM.WORD_SIZE - 1;
  let allocations = {...existingAllocations}; //we'll be adding to this, so we better clone

  //don't allocate things that have already been allocated
  if(parentNode.id in allocations) {
    return allocations;
  }

  //otherwise, we need to allocate
  let memberAllocations = <EvmVariableReferenceMapping>{};

  for(node of definitions)
  {
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
      isChildVariable: true, //??? ask Seese about this TODO
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
    isChildVariable: false, //??? ask Seese about this TODO
    definition: parentNode,
    pointer: wholePointer,
    members: memberAllocations
  }

  //...and we're done!
  return allocations;
}

export function allocateDefinition(node: AstDefinition, referenceDeclarations: AstReferences, path?: DecodeUtils.Allocation.Slot, isChildVariable: boolean = false): void {
}

//TODO: redo the following two.  handling inheritance/constants should be done
//*before* any allocation, not in the middle like this does.
//it really does work the way Seese said it does.
function getStateVariables(contract: ContractObject, initialSlotInfo: SlotAllocation, referenceDeclarations: AstReferences): ContractStateInfo {
  // process for state variables
  const contractNode = getContractNode(contract);
  for (let k = 0; k < contractNode.nodes.length; k++) {
    const node = contractNode.nodes[k];

    if (node.nodeType === "VariableDeclaration" && node.stateVariable === true) {
      allocateDefinition(node, state, referenceDeclarations);
    }
  }

  return state;
}

//TODO: filter out constants
export function getContractStateVariables(contract: ContractObject, contracts: ContractMapping, referenceDeclarations: AstReferences): EvmVariableReferenceMapping {
  let result: EvmVariableReferenceMapping = {};

  if (typeof contract.ast === "undefined") {
    return result;
  }

  const contractNode = getContractNode(contract);

  if (contractNode) {
    // process inheritance
    let slotAllocation: SlotAllocation = {
      offset: new BN(0),
      index: DecodeUtils.EVM.WORD_SIZE - 1
    };

    for (let i = contractNode.linearizedBaseContracts.length - 1; i >= 0; i--) {
      const state = getStateVariables(contracts[contractNode.linearizedBaseContracts[i]], slotAllocation, referenceDeclarations);

      slotAllocation.offset = state.slot.offset;
      slotAllocation.index = state.slot.index;
      merge(result, state.variables);
    }
  }

  return result;
}

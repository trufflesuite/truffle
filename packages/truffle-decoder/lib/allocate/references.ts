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

export function allocateStruct(structDefinition: AstDefinition, referenceDeclarations: AstReferences, slot: DecodeUtils.Allocation.Slot, isChildVariable: boolean = false): ContractStateInfo {
  let structSlotAllocation: SlotAllocation = {
    offset: new BN(0),
    index: DecodeUtils.EVM.WORD_SIZE - 1
  };
  let structContractState: ContractStateInfo = {
    variables: {},
    slot: structSlotAllocation
  };

  if (structDefinition) {
    for (let l = 0; l < structDefinition.members.length; l++) {
      const memberNode = structDefinition.members[l];
      allocateDefinition(memberNode, structContractState, referenceDeclarations, slot, true);
    }
  }

  return structContractState;
}

export function allocateDefinitions(id: string, definitions: [AstDefinition], referenceDeclarations: AstReferences, existingAllocations: EvmVariableReferenceMapping) {
  let offset = new BN(0);
  let index = DecodeUtils.EVM.WORD_SIZE - 1;

  for(node of definitions)
  {
  }
}

export function allocateDefinition(node: AstDefinition, referenceDeclarations: AstReferences, path?: DecodeUtils.Allocation.Slot, isChildVariable: boolean = false): void {
  let slot: DecodeUtils.Allocation.Slot = {
    offset: state.slot.offset.clone()
  };

  if (typeof path !== "undefined") {
    slot.path = cloneDeep(path);
  }

  //TODO: need existingAllocations argument
  let [size, suballocations] = storageSizeAndAllocation(node, referenceDeclarations, existingAllocations);
  let allocations = {...existingAllocations, ...suballocations};

  if (size.words !== undefined) {
    //if it's sized in words, we need to start on a new slot
    slot.index = DecodeUtils.EVM.WORD_SIZE - 1;
    slot.offset.iaddn(1);
  }
  else if (size.bytes < slot.index + 1) {
    //if it's sized in bytes but there's not enough room, we also need a new slot
    slot.index = DecodeUtils.EVM.WORD_SIZE - 1;
    slot.offset = slot.offset.addn(1);
  }
  //otherwise, we remain in place

  //declare range somewhere here TODO

  if(size.words !== undefined) {
    //words case
    range.from.slot = cloneDeep(slot); //start at the current slot...
    range.from.index = 0; //...at the beginning fo the word.
    range.to.slot = cloneDeep(slot); //end at the current slot...
    range.to.slot.offset.iadd(size.words).isubn(1); //...plus # of words minus 1...
    range.to.index = DecodeUtils.EVM.WORD_SIZE - 1; //...at the end of the word.
  }
  else {
    //bytes case
    range.from.slot = cloneDeep(slot); //start at the current slot...
    range.to.slot = cloneDeep(slot); //...and end in the current slot.
    range.to.index = slot.index; //end at the current index...
    range.from.index = slot.index - size.bytes; //...and start appropriately earlier in the slot.
  }

  state.variables[node.id] = <ContractStateVariable>{
    isChildVariable,
    definition: node,
    pointer: <StoragePointer>{
      storage: cloneDeep(range)
    }
  };

  //finally, adjust the current position.
  //if it was sized in words, move down that many slots and reset position w/in slot
  if(size.words !== undefined) {
    slot.offset.iadd(size.words);
    slot.index = DecodeUtils.EVM.WORD_SIZE - 1;
  }
  //if it was sized in bytes, move down an appropriate number of bytes.
  else {
    slot.index -= size.bytes;
    //but if this puts us into the next word, move to the next word.
    if(slot.index < 0) {
      slot.index = DecodeUtils.EVM.WORD_SIZE - 1;
      slot.offset.iaddn(1);
    }
  }

}

function getStateVariables(contract: ContractObject, initialSlotInfo: SlotAllocation, referenceDeclarations: AstReferences): ContractStateInfo {
  let state = <ContractStateInfo>{
    variables: {},
    slot: {
      offset: initialSlotInfo.offset,
      index: initialSlotInfo.index
    }
  }

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

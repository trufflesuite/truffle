import { EvmVariableReferenceMapping, AstReferences, ContractMapping, getContractNode, ContractStateVariable } from "../interface/contract-decoder";
import { ContractObject } from "truffle-contract-schema/spec";
import { StoragePointer } from "../types/pointer";
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

export function getReferenceDeclarations(contracts: ContractObject[]): AstReferences {
  const types = [
    "EnumDefinition",
    "StructDefinition"
  ];

  return getDeclarationsForTypes(contracts, types);
}

export function getEventDefinitions(contracts: ContractObject[]): AstReferences {
  const types = [
    "EventDefinition"
  ];

  return getDeclarationsForTypes(contracts, types);
}

export function allocateDefinition(node: any, state: ContractStateInfo, referenceDeclarations: AstReferences, path?: DecodeUtils.Allocation.Slot, isChildVariable: boolean = false): void {
  let slot: DecodeUtils.Allocation.Slot = {
    offset: state.slot.offset.clone()
  };

  if (typeof path !== "undefined") {
    slot.path = cloneDeep(path);
    slot.offset = new BN(0);
  }

  if (DecodeUtils.Definition.typeClass(node) != "struct") {
    const range = DecodeUtils.Allocation.allocateValue(slot, state.slot.index, DecodeUtils.Definition.storageSize(node));

    state.variables[node.id] = <ContractStateVariable>{
      isChildVariable,
      definition: node,
      pointer: <StoragePointer>{
        storage: cloneDeep(range)
      }
    };

    state.slot.offset = range.next.slot.offset.clone();
    state.slot.index = range.next.index;
  }
  else {
    const structDefinition = referenceDeclarations[node.typeName.referencedDeclaration]; // ast node of StructDefinition
    if (structDefinition) {
      let structSlotAllocation: SlotAllocation = {
        offset: new BN(0),
        index: DecodeUtils.EVM.WORD_SIZE - 1
      };
      let structContractState: ContractStateInfo = {
        variables: state.variables,
        slot: structSlotAllocation
      };

      for (let l = 0; l < structDefinition.members.length; l++) {
        const memberNode = structDefinition.members[l];
        state.variables[node.id] = <ContractStateVariable>{
          isChildVariable,
          definition: node,
          pointer: <StoragePointer>{
            storage: {
              from: {
                slot: slot,
                index: 0
              },
              to: {
                slot: slot,
                index: 0
              }
            }
          }
        };
        allocateDefinition(memberNode, structContractState, referenceDeclarations, slot, true);
      }

      state.slot.offset = state.slot.offset.add(structContractState.slot.offset);
      state.slot.index = DecodeUtils.EVM.WORD_SIZE - 1;
      if (structContractState.slot.index < DecodeUtils.EVM.WORD_SIZE - 1) {
        state.slot.offset = state.slot.offset.addn(1);
      }
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
import { AstDefinition, AstReferences } from "truffle-decode-utils";
import { ContractObject } from "truffle-contract-schema/spec";

export function getContractNode(contract: ContractObject): AstDefinition {
  return (contract.ast || {nodes: []}).nodes.find(
    (contractNode: AstDefinition) =>
    contractNode.nodeType === "ContractDefinition"
    && (contractNode.name === contract.contractName
      || contractNode.name === contract.contract_name)
  );
}

function getDeclarationsForTypes(contracts: AstDefinition[], types: string[]): AstReferences {
  let result: AstReferences = {};

  for (let contract of contracts) {
    if (contract) {
      for (const node of contract.nodes) {
        if (types.includes(node.nodeType)) {
          result[node.id] = node;
        }
      }
    }
  }

  return result;
}

export function getEventDefinitions(contracts: AstDefinition[]): AstReferences {
  const types = [
    "EventDefinition"
  ];

  return getDeclarationsForTypes(contracts, types);
}

export function makeContext(contract: ContractObject, node: AstDefinition, isConstructor = false): DecoderContext {
  return {
    contractName: contract.contractName,
    binary: isConstructor ? contract.bytecode : contract.deployedBytecode,
    contractId: node.id,
    contractKind: node.contractKind,
    isConstructor,
    abi: DecodeUtils.Contexts.abiToFunctionAbiWithSignatures(contract.abi),
    payable: DecodeUtils.Contexts.isABIPayable(contract.abi),
    compiler: contract.compiler
  };
}

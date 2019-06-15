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

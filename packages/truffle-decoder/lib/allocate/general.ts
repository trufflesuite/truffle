import { AstDefinition, AstReferences } from "truffle-decode-utils";

function getDeclarationsForTypes(contracts: AstDefinition[], types: string[]): AstReferences {
  let result: AstReferences = {};

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];
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

export function getReferenceDeclarations(contracts: AstDefinition[]): AstReferences {
  const types = [
    "EnumDefinition",
    "StructDefinition",
  ];

  let contractsObject: AstReferences = Object.assign({}, ...contracts.map(
    (node: AstDefinition) => ({[node.id]: node})));

  return {...getDeclarationsForTypes(contracts, types), ...contractsObject};
}

export function getEventDefinitions(contracts: AstDefinition[]): AstReferences {
  const types = [
    "EventDefinition"
  ];

  return getDeclarationsForTypes(contracts, types);
}

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

  return [...getDeclarationsForTypes(contracts, types), ...contracts];
}

export function getEventDefinitions(contracts: ContractObject[]): AstReferences {
  const types = [
    "EventDefinition"
  ];

  return getDeclarationsForTypes(contracts, types);
}


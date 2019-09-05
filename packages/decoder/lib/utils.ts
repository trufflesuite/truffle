import { AstDefinition, AstReferences, AbiUtils, Contexts as ContextsUtils } from "truffle-codec-utils";
import { ContractObject } from "@truffle/contract-schema/spec";

export function getContractNode(contract: ContractObject): AstDefinition {
  return (contract.ast || {nodes: []}).nodes.find(
    (contractNode: AstDefinition) =>
    contractNode.nodeType === "ContractDefinition"
    && (contractNode.name === contract.contractName
      || contractNode.name === contract.contract_name)
  );
}

export function makeContext(contract: ContractObject, node: AstDefinition, isConstructor = false): ContextsUtils.DecoderContext {
  let abi = AbiUtils.schemaAbiToAbi(contract.abi);
  return {
    contractName: contract.contractName,
    binary: isConstructor ? contract.bytecode : contract.deployedBytecode,
    contractId: node.id,
    contractKind: node.contractKind,
    isConstructor,
    abi: AbiUtils.computeSelectors(abi),
    payable: AbiUtils.abiHasPayableFallback(abi),
    compiler: contract.compiler
  };
}

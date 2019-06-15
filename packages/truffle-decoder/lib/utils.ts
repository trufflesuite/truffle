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

import { AstDefinition, AstReferences, AbiUtils, Contexts as ContextsUtils } from "truffle-codec-utils";
import { ContractObject } from "truffle-contract-schema/spec";
import * as CodecUtils from "truffle-codec-utils";

export function getContractNode(contract: ContractObject): AstDefinition {
  return (contract.ast || {nodes: []}).nodes.find(
    (contractNode: AstDefinition) =>
    contractNode.nodeType === "ContractDefinition"
    && (contractNode.name === contract.contractName
      || contractNode.name === contract.contract_name)
  );
}

export function makeContext(contract: ContractObject, node: AstDefinition, isConstructor = false): ContextsUtils.DecoderContext {
  const abi = AbiUtils.schemaAbiToAbi(contract.abi);
  const binary = isConstructor ? contract.bytecode : contract.deployedBytecode;
  const hash = CodecUtils.Conversion.toHexString(
    CodecUtils.EVM.keccak256({type: "string",
      value: binary
    })
  );
  return {
    context: hash,
    contractName: contract.contractName,
    binary,
    contractId: node ? node.id : undefined,
    contractKind: node ? node.contractKind : "contract", //assume contracts are ordinary contracts unless told otherwise
    isConstructor,
    abi: AbiUtils.computeSelectors(abi),
    payable: AbiUtils.abiHasPayableFallback(abi),
    hasFallback: AbiUtils.abiHasFallback(abi),
    compiler: contract.compiler
  };
}

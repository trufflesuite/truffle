import { ContractObject } from "@truffle/contract-schema/spec";
import { AbiUtils } from "./abi";
import { Conversion as ConversionUtils } from "./conversion";
import { EVM as EVMUtils } from "./evm";
import { Ast, Contexts, Common } from "@truffle/codec/types";

export function getContractNode(contract: ContractObject): Ast.AstNode {
  return (contract.ast || {nodes: []}).nodes.find(
    (contractNode: Ast.AstNode) =>
    contractNode.nodeType === "ContractDefinition"
    && (contractNode.name === contract.contractName
      || contractNode.name === contract.contract_name)
  );
}

export function makeContext(contract: ContractObject, node: Ast.AstNode | undefined, isConstructor = false): Contexts.DecoderContext {
  const abi = AbiUtils.schemaAbiToAbi(contract.abi);
  const binary = isConstructor ? contract.bytecode : contract.deployedBytecode;
  const hash = ConversionUtils.toHexString(
    EVMUtils.keccak256({type: "string",
      value: binary
    })
  );
  return {
    context: hash,
    contractName: contract.contractName,
    binary,
    contractId: node ? node.id : undefined,
    contractKind: contractKind(contract, node),
    isConstructor,
    abi: AbiUtils.computeSelectors(abi),
    payable: AbiUtils.abiHasPayableFallback(abi),
    hasFallback: AbiUtils.abiHasFallback(abi),
    compiler: contract.compiler
  };
}

//attempts to determine if the given contract is a library or not
function contractKind(contract: ContractObject, node?: Ast.AstNode): Common.ContractKind {
  //first: if we have a node, use its listed contract kind
  if(node) {
    return node.contractKind;
  }
  //next: check the contract kind field on the contract object itself, if it exists.
  //however this isn't implemented yet so we'll skip it.
  //next: if we have no direct info on the contract kind, but we do
  //have the deployed bytecode, we'll use a HACK:
  //we'll assume it's an ordinary contract, UNLESS its deployed bytecode begins with
  //PUSH20 followed by 20 0s, in which case we'll assume it's a library
  //(note: this will fail to detect libraries from before Solidity 0.4.20)
  if(contract.deployedBytecode) {
    const pushAddressInstruction = (
      0x60 +
      EVMUtils.ADDRESS_SIZE -
      1
    ).toString(16); //"73"
    const libraryString = "0x" + pushAddressInstruction + "00".repeat(EVMUtils.ADDRESS_SIZE);
    return contract.deployedBytecode.startsWith(libraryString) ? "library" : "contract";
  }
  //finally, in the absence of anything to go on, we'll assume it's an ordinary contract
  return "contract";
}

import { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import Web3 from "web3";
import BN from "bn.js";

import * as Codec from "@truffle/codec";

import * as Types from "./types";

//NOTE: Definitely do not use this in real code!  For tests only!
//for convenience: invokes the nativize method on all the given variables, and changes them to
//the old format
export function nativizeDecoderVariables(
  variables: Types.StateVariable[]
): { [name: string]: any } {
  return Object.assign(
    {},
    ...variables.map(({ name, value }) => ({
      [name]: Codec.Format.Utils.Inspect.nativize(value)
    }))
  );
  //note that the assignments are processed in order, so if multiple have same name, later
  //(i.e. more derived) will overwrite earlier (i.e. baser)... be aware!  I mean, this is the
  //right way to do overwriting, but it's still overwriting so still dangerous.
  //Again, don't use this in real code!
}

export function getContractNode(contract: Artifact): Codec.Ast.AstNode {
  return (contract.ast || { nodes: [] }).nodes.find(
    (contractNode: Codec.Ast.AstNode) =>
      contractNode.nodeType === "ContractDefinition" &&
      (contractNode.name === contract.contractName ||
        contractNode.name === contract.contract_name)
  );
}

export function makeContext(
  contract: Artifact,
  node: Codec.Ast.AstNode | undefined,
  isConstructor = false
): Codec.Contexts.DecoderContext {
  const abi = Codec.AbiData.Utils.schemaAbiToAbi(contract.abi);
  const binary = isConstructor ? contract.bytecode : contract.deployedBytecode;
  const hash = Codec.Conversion.toHexString(
    Codec.Evm.Utils.keccak256({
      type: "string",
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
    abi: Codec.AbiData.Utils.computeSelectors(abi),
    payable: Codec.AbiData.Utils.abiHasPayableFallback(abi),
    hasFallback: Codec.AbiData.Utils.abiHasFallback(abi),
    compiler: contract.compiler
  };
}

//attempts to determine if the given contract is a library or not
function contractKind(
  contract: Artifact,
  node?: Codec.Ast.AstNode
): Codec.ContractKind {
  //first: if we have a node, use its listed contract kind
  if (node) {
    return node.contractKind;
  }
  //next: check the contract kind field on the contract object itself, if it exists.
  //however this isn't implemented yet so we'll skip it.
  //next: if we have no direct info on the contract kind, but we do
  //have the deployed bytecode, we'll use a HACK:
  //we'll assume it's an ordinary contract, UNLESS its deployed bytecode begins with
  //PUSH20 followed by 20 0s, in which case we'll assume it's a library
  //(note: this will fail to detect libraries from before Solidity 0.4.20)
  if (contract.deployedBytecode) {
    const pushAddressInstruction = (
      0x60 +
      Codec.Evm.Utils.ADDRESS_SIZE -
      1
    ).toString(16); //"73"
    const libraryString =
      "0x" + pushAddressInstruction + "00".repeat(Codec.Evm.Utils.ADDRESS_SIZE);
    return contract.deployedBytecode.startsWith(libraryString)
      ? "library"
      : "contract";
  }
  //finally, in the absence of anything to go on, we'll assume it's an ordinary contract
  return "contract";
}

//Function for wrapping a value as an ElementaryValue
//WARNING: this function does not check its inputs! Please check before using!
//How to use:
//numbers may be BN, number, or numeric string
//strings should be given as strings. duh.
//bytes should be given as hex strings beginning with "0x"
//addresses are like bytes; checksum case is not required
//booleans may be given either as booleans, or as string "true" or "false"
//[NOTE: in the future this function will:
//1. check its inputs,
//2. take a slightly different input format,
//3. also be named differently and... it'll be different :P ]
export function wrapElementaryViaDefinition(
  value: any,
  definition: Codec.Ast.AstNode,
  compiler: Codec.Compiler.CompilerVersion
): Codec.Format.Values.ElementaryValue {
  let dataType = Codec.Ast.Import.definitionToType(definition, compiler, null); //force location to undefined
  return wrapElementaryValue(value, dataType);
}

export function wrapElementaryValue(
  value: any,
  dataType: Codec.Format.Types.Type
): Codec.Format.Values.ElementaryValue {
  switch (dataType.typeClass) {
    case "string":
      return {
        type: dataType,
        kind: "value",
        value: {
          kind: "valid",
          asString: <string>value
        }
      };
    case "bytes":
      //NOTE: in the future should add padding for static case
      return <Codec.Format.Values.BytesValue>{
        //TS is so bad at unions
        type: dataType,
        kind: "value",
        value: {
          asHex: value
        }
      };
    case "address":
      value = Web3.utils.toChecksumAddress(value);
      return {
        type: dataType,
        kind: "value",
        value: {
          asAddress: <string>value
        }
      };
    case "uint":
    case "int":
      if (value instanceof BN) {
        value = value.clone();
      } else {
        value = new BN(value);
      }
      return <Codec.Format.Values.UintValue | Codec.Format.Values.IntValue>{
        //TS remains bad at unions
        type: dataType,
        kind: "value",
        value: {
          asBN: value
        }
      };
    case "bool":
      if (typeof value === "string") {
        value = value !== "false";
      }
      return {
        type: dataType,
        kind: "value",
        value: {
          asBoolean: <boolean>value
        }
      };
    //fixed and ufixed are not handled for now!
  }
}

import { EvmVariableReferenceMapping } from "../interface/contract-decoder";
import { TruffleContractInstance } from "../interface/truffle-contract";

export default async function getVariableReferences(contract: TruffleContractInstance, inheritedContracts: TruffleContractInstance[]): Promise<EvmVariableReferenceMapping> {
  let result: EvmVariableReferenceMapping = {};

  return result;
}
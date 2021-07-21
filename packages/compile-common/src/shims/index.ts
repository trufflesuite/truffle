import { CompiledContract, TezosCompiledContract } from "../types";
import * as EvmNewToLegacy from "./NewToLegacy";

const SUPPORTED_ARCHITECTURES: { [key: string]: (contract: CompiledContract) => any } = {
  evm: EvmNewToLegacy.forContract,
  tezos: (contract: TezosCompiledContract) => { return contract; }
};

function forContract(contract: CompiledContract): any {
  const contractMapper = contract.architecture ? SUPPORTED_ARCHITECTURES[contract.architecture] : EvmNewToLegacy.forContract;
  if (!contractMapper) throw new Error("Unsupported architecture: " + contract.architecture);

  return contractMapper(contract);
}

export const NewToLegacy = { ...EvmNewToLegacy, forContract };
export * as LegacyToNew from "./LegacyToNew";

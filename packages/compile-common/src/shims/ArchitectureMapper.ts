import { CompiledContract, TezosCompiledContract } from "../types";
import { forContract as forEvmContract } from "./NewToLegacy";

const SUPPORTED_ARCHITECTURES: { [key: string]: (contract: CompiledContract) => any } = {
  evm: forEvmContract,
  tezos: (contract: TezosCompiledContract) => { return contract; }
};

export function forContract(contract: CompiledContract): any {
  const contractMapper = contract.architecture ? SUPPORTED_ARCHITECTURES[contract.architecture] : forEvmContract;
  if (!contractMapper) throw new Error("Unsupported architecture: " + contract.architecture);

  return contractMapper(contract);
}
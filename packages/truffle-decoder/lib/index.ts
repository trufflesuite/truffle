import TruffleContractDecoder from "./contract";
import TruffleWireDecoder from "./wire";
import { Provider } from "web3/providers";
import { ContractObject } from "truffle-contract-schema/spec";

export async function forContract(contract: ContractObject, relevantContracts: ContractObject[], provider: Provider, address?: string): Promise<TruffleContractDecoder> {
  let decoder = new TruffleContractDecoder(contract, relevantContracts, provider, address);
  await decoder.init();
  return decoder;
}

export async function forProject(contracts: ContractObject[], provider: Provider): Promise<TruffleWireDecoder> {
  let decoder = new TruffleWireDecoder(contracts, provider);
  await decoder.init();
  return decoder;
}

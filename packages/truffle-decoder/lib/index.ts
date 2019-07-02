import TruffleContractDecoder from "./decoder";
import { Provider } from "web3/providers";
import { ContractObject } from "truffle-contract-schema/spec";

export function forContract(contract: ContractObject, relevantContracts: ContractObject[], provider: Provider, address?: string): TruffleContractDecoder {
  return new TruffleContractDecoder(contract, relevantContracts, provider, address);
}

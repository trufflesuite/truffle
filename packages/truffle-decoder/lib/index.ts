import debugModule from "debug";
const debug = debugModule("decoder");

import TruffleContractDecoder from "./contract";
import { TruffleContractInstanceDecoder } from "./contract";
import TruffleWireDecoder from "./wire";
import { Provider } from "web3/providers";
import { ContractObject } from "truffle-contract-schema/spec";

export async function forContractInstance(contract: ContractObject, relevantContracts: ContractObject[], provider: Provider, address?: string): Promise<TruffleContractInstanceDecoder> {
  let contractDecoder = await forContract(contract, relevantContracts, provider);
  let instanceDecoder = await contractDecoder.forInstance(address);
  return instanceDecoder;
}

export async function forContract(contract: ContractObject, relevantContracts: ContractObject[], provider: Provider): Promise<TruffleContractDecoder> {
  let contracts = relevantContracts.includes(contract)
    ? relevantContracts
    : [contract, ...relevantContracts];
  let wireDecoder = await forProject(contracts, provider);
  let contractDecoder = new TruffleContractDecoder(contract, wireDecoder);
  await contractDecoder.init();
  return contractDecoder;
}

export async function forProject(contracts: ContractObject[], provider: Provider): Promise<TruffleWireDecoder> {
  return new TruffleWireDecoder(contracts, provider);
}

export async function forContractWithDecoder(contract: ContractObject, decoder: TruffleWireDecoder): Promise<TruffleContractDecoder> {
  let contractDecoder = new TruffleContractDecoder(contract, decoder);
  await contractDecoder.init();
  return contractDecoder;
}

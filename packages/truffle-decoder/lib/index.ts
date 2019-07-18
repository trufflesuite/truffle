import debugModule from "debug";
const debug = debugModule("decoder");

import TruffleContractDecoder from "./contract";
import TruffleWireDecoder from "./wire";
import { Provider } from "web3/providers";
import { ContractObject } from "truffle-contract-schema/spec";

export async function forContract(contract: ContractObject, relevantContracts: ContractObject[], provider: Provider, address?: string): Promise<TruffleContractDecoder> {
  let contracts = relevantContracts.includes(contract)
    ? relevantContracts
    : [contract, ...relevantContracts];
  let wireDecoder = new TruffleWireDecoder(contracts, provider);
  let contractDecoder = new TruffleContractDecoder(contract, wireDecoder, address);
  await contractDecoder.init();
  return contractDecoder;
}

export async function forProject(contracts: ContractObject[], provider: Provider): Promise<TruffleWireDecoder> {
  return new TruffleWireDecoder(contracts, provider);
}

export async function forContractWithDecoder(contract: ContractObject, decoder: TruffleWireDecoder, address?: string): Promise<TruffleContractDecoder> {
  let contractDecoder = new TruffleContractDecoder(contract, decoder, address);
  await contractDecoder.init();
  return contractDecoder;
}

import debugModule from "debug";
/** @hidden */
const debug = debugModule("codec:interface");

import * as Decoders from "./decoders";
export { Decoders };

import * as Errors from "./errors";
export { Errors };

import * as Types from "./types";
export { Types };

import { Provider } from "web3/providers";
import { ContractObject } from "@truffle/contract-schema/spec";

export async function forContractInstance(contract: ContractObject, relevantContracts: ContractObject[], provider: Provider, address?: string): Promise<Decoders.ContractInstanceDecoder> {
  let contractDecoder = await forContract(contract, relevantContracts, provider);
  let instanceDecoder = await contractDecoder.forInstance(address);
  return instanceDecoder;
}

export async function forContract(contract: ContractObject, relevantContracts: ContractObject[], provider: Provider): Promise<Decoders.ContractDecoder> {
  let contracts = relevantContracts.includes(contract)
    ? relevantContracts
    : [contract, ...relevantContracts];
  let wireDecoder = await forProject(contracts, provider);
  let contractDecoder = new Decoders.ContractDecoder(contract, wireDecoder);
  await contractDecoder.init();
  return contractDecoder;
}

export async function forProject(contracts: ContractObject[], provider: Provider): Promise<Decoders.WireDecoder> {
  return new Decoders.WireDecoder(contracts, provider);
}

export async function forContractWithDecoder(contract: ContractObject, decoder: Decoders.WireDecoder): Promise<Decoders.ContractDecoder> {
  let contractDecoder = new Decoders.ContractDecoder(contract, decoder);
  await contractDecoder.init();
  return contractDecoder;
}

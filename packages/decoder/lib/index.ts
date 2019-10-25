/**
 * Usage:
 *
 * ```
 * import { ... } from "@truffle/decoder";
 * ```
 *
 * @module @truffle/decoder
 */ /** */

import {
  ContractDecoder,
  ContractInstanceDecoder,
  WireDecoder
} from "./decoders";
export { ContractDecoder, ContractInstanceDecoder, WireDecoder };

export {
  ContractBeingDecodedHasNoNodeError,
  ContractAllocationFailedError
} from "./errors";

export {
  ContractState,
  StateVariable,
  DecodedTransaction,
  DecodedLog,
  EventOptions
} from "./types";

import { Provider } from "web3/providers";
import { ContractObject } from "@truffle/contract-schema/spec";

/**
 * Constructs a contract instance decoder for a given contract instance.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param relevantContracts A list of contract constructor objects for other contracts in the project that may be relevant
 * (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 * Including the contract itself here is fine; so is excluding it.
 * @param provider The Web3 provider object to use.
 * @param address The address of the contract instance to decode.  If left out, it will be autodetected on startup.
 *   If an invalid address is provided, this function will throw an exception.
 */
export async function forContractInstance(
  contract: ContractObject,
  relevantContracts: ContractObject[],
  provider: Provider,
  address?: string
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forContract(
    contract,
    relevantContracts,
    provider
  );
  let instanceDecoder = await contractDecoder.forInstance(address);
  return instanceDecoder;
}

/**
 * Constructs a contract instance decoder for a given contract instance.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param relevantContracts A list of contract constructor objects for other contracts in the project that may be relevant
 * (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 * Including the contract itself here is fine; so is excluding it.
 * @param provider The Web3 provider object to use.
 */
export async function forContract(
  contract: ContractObject,
  relevantContracts: ContractObject[],
  provider: Provider
): Promise<ContractDecoder> {
  let contracts = relevantContracts.includes(contract)
    ? relevantContracts
    : [contract, ...relevantContracts];
  let wireDecoder = await forProject(contracts, provider);
  let contractDecoder = new ContractDecoder(contract, wireDecoder);
  await contractDecoder.init();
  return contractDecoder;
}

/**
 * Constructs a wire decoder for the project.
 * @param contracts A list of contract constructor objects for contracts in the project.
 * @param provider The Web3 provider object to use.
 */
export async function forProject(
  contracts: ContractObject[],
  provider: Provider
): Promise<WireDecoder> {
  return new WireDecoder(contracts, provider);
}

/**
 * Constructs a contract decoder given an existing wire decoder for the project.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param decoder An existing wire decoder for the project.
 */
export async function forContractWithDecoder(
  contract: ContractObject,
  decoder: WireDecoder
): Promise<ContractDecoder> {
  let contractDecoder = new ContractDecoder(contract, decoder);
  await contractDecoder.init();
  return contractDecoder;
}

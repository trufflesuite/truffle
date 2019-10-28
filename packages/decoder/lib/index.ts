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
import { ContractConstructorObject, ContractInstanceObject } from "./types";

/**
 * Constructs a wire decoder for the project.
 * @param provider The Web3 provider object to use.
 * @param contracts A list of contract artifacts for contracts in the project.
 *
 *   Contract constructor objects may be substituted for artifacts, so if
 *   you're not sure which you're dealing with, it's OK.
 *
 *   This parameter is intended to be made optional in the future.
 */
export async function forProject(
  provider: Provider,
  contracts: ContractObject[]
): Promise<WireDecoder> {
  return new WireDecoder(contracts, provider);
}

/**
 * Constructs a contract instance decoder for a given contract instance.
 * @param contract The artifact for the contract.
 *
 *   A contract constructor object may be substituted for the artifact, so if
 *   you're not sure which you're dealing with, it's OK.
 * @param provider The Web3 provider object to use.
 * @param relevantContracts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   Contract constructor objects may be substituted for artifacts, so if
 *   you're not sure which you're dealing with, it's OK.
 *
 *   Including the contract itself here is fine; so is excluding it.
 *
 *   This parameter is intended to be made optional in the future.
 */
export async function forArtifact(
  contract: ContractObject,
  provider: Provider,
  relevantContracts: ContractObject[]
): Promise<ContractDecoder> {
  let contracts = relevantContracts.includes(contract)
    ? relevantContracts
    : [contract, ...relevantContracts];
  let wireDecoder = await forProject(provider, contracts);
  let contractDecoder = new ContractDecoder(contract, wireDecoder);
  await contractDecoder.init();
  return contractDecoder;
}

/**
 * Constructs a contract instance decoder for a given contract instance.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param provider The Web3 provider object to use.
 * @param relevantContracts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   See the relevantContracts parameter documentation on [[forArtifact]] for more detail.
 *
 *   This parameter is intended to be made optional in the future.
 */
export async function forContract(
  contract: ContractConstructorObject,
  relevantContracts: ContractObject[]
): Promise<ContractDecoder> {
  return await forArtifact(
    contract,
    contract.web3.currentProvider,
    relevantContracts
  );
}

/**
 * Constructs a contract decoder given an existing wire decoder for the project.
 * @param contract The artifact corresponding to the type of the contract.
 *
 *   A contract constructor object may be substituted for the artifact, so if
 *   you're not sure which you're dealing with, it's OK.
 * @param decoder An existing wire decoder for the project.
 */
export async function forArtifactWithDecoder(
  contract: ContractObject,
  decoder: WireDecoder
): Promise<ContractDecoder> {
  let contractDecoder = new ContractDecoder(contract, decoder);
  await contractDecoder.init();
  return contractDecoder;
}

/**
 * Constructs a contract instance decoder for a deployed contract instance.
 * @param contract The artifact corresponding to the type of the contract.
 *
 *   A contract constructor object may be substituted for the artifact, so if
 *   you're not sure which you're dealing with, it's OK.
 * @param provider The Web3 provider object to use.
 * @param relevantContracts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   See the relevantContracts parameter documentation on [[forArtifact]] for more detail.
 *
 *   This parameter is intended to be made optional in the future.
 */
export async function forDeployedArtifact(
  contract: ContractObject,
  provider: Provider,
  relevantContracts: ContractObject[]
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forArtifact(
    contract,
    provider,
    relevantContracts
  );
  let instanceDecoder = await contractDecoder.forInstance();
  return instanceDecoder;
}

/**
 * Constructs a contract instance decoder for a deployed contract instance.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param relevantContracts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   See the relevantContracts parameter documentation on [[forArtifact]] for more detail.
 *
 *   This parameter is intended to be made optional in the future.
 */
export async function forDeployedContract(
  contract: ContractConstructorObject,
  relevantContracts: ContractObject[]
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forContract(contract, relevantContracts);
  let instanceDecoder = await contractDecoder.forInstance();
  return instanceDecoder;
}

/**
 * Constructs a contract instance decoder for a contract instance at a given address.
 * @param contract The artifact corresponding to the type of the contract.
 *
 *   A contract constructor object may be substituted for the artifact, so if
 *   you're not sure which you're dealing with, it's OK.
 * @param provider The Web3 provider object to use.
 * @param address The address of the contract instance to decode.
 *
 *   Address must either be checksummed, or in all one case to circumvent the checksum.
 *   Mixed-case with bad checksum will cause this function to throw an exception.
 * @param relevantContracts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   See the relevantContracts parameter documentation on [[forArtifact]] for more detail.
 *
 *   This parameter is intended to be made optional in the future.
 */
export async function forArtifactAt(
  contract: ContractObject,
  provider: Provider,
  address: string,
  relevantContracts: ContractObject[]
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forArtifact(
    contract,
    provider,
    relevantContracts
  );
  let instanceDecoder = await contractDecoder.forInstance(address);
  return instanceDecoder;
}

/**
 * Constructs a contract instance decoder for a contract instance at a given address.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param address The address of the contract instance to decode.
 *
 *   Address must either be checksummed, or in all one case to circumvent the checksum.
 *   Mixed-case with bad checksum will cause this function to throw an exception.
 * @param relevantContracts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   See the relevantContracts parameter documentation on [[forArtifact]] for more detail.
 *
 *   This parameter is intended to be made optional in the future.
 */
export async function forContractAt(
  contract: ContractConstructorObject,
  address: string,
  relevantContracts: ContractObject[]
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forContract(contract, relevantContracts);
  let instanceDecoder = await contractDecoder.forInstance(address);
  return instanceDecoder;
}

/**
 * Constructs a contract instance decoder for a given contract instance.
 * @param contract The contract abstraction object corresponding to the contract instance.
 * @param relevantContracts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   See the relevantContracts parameter documentation on [[forArtifact]] for more detail.
 *
 *   This parameter is intended to be made optional in the future.
 */
export async function forContractAbstraction(
  contract: ContractInstanceObject,
  relevantContracts: ContractObject[]
): Promise<ContractInstanceDecoder> {
  return await forContractAt(
    contract.constructor,
    contract.address,
    relevantContracts
  );
}

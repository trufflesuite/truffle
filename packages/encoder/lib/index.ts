/**
 * # Truffle Encoder
 * 
 * This module provides an interface for recognizing JavaScript user input of
 * Solidity values, encoding those values for use in a transaction, and performing
 * overload resolution based on those values to determine which Solidity method to
 * encode for.
 * 
 * The interface is split into three classes: The project encoder, the contract
 * encoder, and the contract instance encoder.  The project encoder is associated
 * to the project as a whole; it can recognize user input, encode transactions,
 * and resolve overloads, although the interface for the latter two is somewhat
 * inconvenient.  The contract encoder is associated to a specific contract class.
 * It is similar to the project encoder, but presents an easier-to-use interface
 * for transaction encoding and overload resolution, so long as one is dealing
 * with methods of the specified class.  The contract instance encoder is
 * associated to a specific contract instance; it is like the contract encoder,
 * but is associated to a specific address, allowing the `to` option in
 * transactions to be populated automatically.
 * 
 * ## Usage
 * 
 * ### Initialization
 * 
 * Create a encoder with one of the various constructor functions.
 * 
 * For a project encoder, use the [[forProject|`forProject`]] function.
 * 
 * For a contract encoder, use the [[forArtifact|`forArtifact`]] or
 * [[forContract|`forContract`]] function.
 * 
 * For a contract instance encoder, use one of the following:
 * * [[forDeployedArtifact|`forDeployedArtifact`]]
 * * [[forDeployedContract|`forDeployedContract`]]
 * * [[forArtifactAt|`forArtifactAt`]]
 * * [[forContractAt|`forContractAt`]]
 * * [[forContractInstance|`forContractInstance`]]
 * 
 * See the documentation of these functions for details, or below for usage
 * examples.
 * 
 * All of these functions take a final argument in which information about the
 * project is specified; currently only a few methods for specifying project
 * information are allowed, but more are planned.
 * 
 * One can also spawn encoders from other encoders by supplying additional
 * information.  See the documentation for the individual encoder classes for a
 * method listing.
 * 
 * ### Encoder methods
 * 
 * See the documentation for the individual encoder classes for a method listing.
 * 
 * ### Wrapped format information
 * 
 * When using the various "wrap" functions, values will be wrapped in
 * machine-readable [[Format.Values.Value]] objects containing individual wrapped
 * values.  (This is the same format that `@truffle/decoder` produces output in.)
 * See the [[Format|format documentation]] for an overview and complete module
 * listing.
 * 
 * ### Use of project information and encoding of enums
 * 
 * The encoder can do purely ABI-based encoding, like other encoders; however it
 * has the capability to use project information to do more.
 * 
 * The most significant use of this is that if further project information is
 * present, this allows for enums to be entered as strings with the name of
 * the option, rather than having to be entered via the underlying number.
 * See the documentation of [[ProjectEncoder.wrap]] for more.
 * 
 * Similarly, if project information is present, the encoder will also throw an
 * error if you attempt to put an out-of-range value into an enum type, and
 * refuse to consider overloads that would result in this during overload
 * resolution.  If project information is absent, the encoder will be unable to
 * recognize any error in these situations.
 * 
 * ### ENS resolution
 * 
 * The encoder supports ENS resolution for address and contract types if
 * initialized to support such.  See the documentation of the [[EncoderSettings]]
 * and [[EnsSettings]] types for more.
 * 
 * ### Basic usage examples
 * 
 * These usage examples are for a project with two contracts, `Contract1` and
 * `Contract2`.  Let's suppose these look like the following:
 * 
 * ```solidity
 *pragma solidity ^0.8.0;
 *
 *contract Contract1 {
 *  function enumExample(Contract2.Ternary x) public payable {
 *  }
 *
 *  function overloaded(uint x) public payable {
 *  }
 *
 *  function overloaded(string x) public payable {
 *  }
 *}
 *
 *contract Contract2 {
 *  enum Ternary { No, Yes, Maybe }
 *}
 * ```
 * 
 * #### Encoding a transaction
 * 
 * ```typescript
 *import { forContract } from "@truffle/encoder";
 *const contract1 = artifacts.require("Contract1");
 *const contract2 = artifacts.require("Contract2");
 *const encoder = await Encoder.forContract(Contract1, [Contract1, Contract2]);
 *const abi = Contract1.abi.find(abiEntry => abiEntry.name === "enumExample");
 *const tx = await encoder.encodeTransaction(
 *  abi,
 *  ["Maybe", { value: 1 }],
 *  { allowOptions: true }
 *);
 * ```
 * 
 * ### Performing overload resolution
 * 
 * ```typescript
 *import { forContract } from "@truffle/encoder";
 *const contract1 = artifacts.require("Contract1");
 *const contract2 = artifacts.require("Contract2");
 *const encoder = await Encoder.forContract(Contract1, [Contract1, Contract2]);
 *const abis = Contract1.abi.filter(abiEntry => abiEntry.name === "overloaded");
 *const { tx, abi } = await encoder.encodeTransaction(
 *  abis,
 *  ["hello", { value: 1 }],
 *  { allowOptions: true }
 *);
 * ```
 *
 * @module @truffle/encoder
 * @packageDocumentation
 */

import {
  ProjectEncoder,
  ContractEncoder,
  ContractInstanceEncoder
} from "./encoders";
export { ProjectEncoder, ContractEncoder, ContractInstanceEncoder };

import type {
  EncoderSettings,
  EnsSettings,
  EncoderInfoInternal,
  TxAndAbi
} from "./types";
export { EncoderSettings, EnsSettings, TxAndAbi, EncoderInfoInternal };
export type { ResolveOptions } from "./types";
import type {
  ContractInstanceObject,
  ContractConstructorObject
} from "./types";
import type { ContractObject as Artifact } from "@truffle/contract-schema/spec";

export {
  InvalidAddressError,
  NoInternalInfoError,
  UnlinkedContractError,
  ContractNotFoundError,
  ContractNotDeployedError
} from "./errors";

import { Compilations } from "@truffle/codec";
import Web3 from "web3";

/**
 * @hidden
 */
type ProjectInfo = Compilations.ProjectInfo;
export { ProjectInfo };

/**
 * **This function is asynchronous.**
 *
 * Constructs a project encoder for the project.
 * @category Constructors
 */
export async function forProject(
  settings: EncoderSettings
): Promise<ProjectEncoder> {
  const compilations = Compilations.Utils.infoToCompilations(
    settings.projectInfo
  );
  const ens = ensSettingsForInfo(settings);
  const networkId = await networkIdForInfo(settings);
  const encoder = new ProjectEncoder({ compilations, networkId, ...ens });
  await encoder.init();
  return encoder;
}

/**
 * @protected
 * @category Constructors
 */
export async function forProjectInternal(
  info: EncoderInfoInternal
): Promise<ProjectEncoder> {
  const encoder = new ProjectEncoder(info);
  await encoder.init();
  return encoder;
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract encoder for a given contract artifact.
 * @param artifact The artifact for the contract.
 *
 *   A contract constructor object may be substituted for the artifact, so if
 *   you're not sure which you're dealing with, it's OK.
 * @param settings The [[EncoderSettings]] to use;
 *   see the documentation for that type for more information.  If absent, the
 *   encoder will be based on just the single contract provided; it is
 *   recommended to pass more information to get the encoder's full power.
 *
 *   Note that if the artifact contains unlinked libraries, you will have to
 *   pass either the `provider` or `networkId` setting in order to encode
 *   contract creation transactions.
 * @category Constructors
 */
export async function forArtifact(
  artifact: Artifact,
  settings: EncoderSettings = {}
): Promise<ContractEncoder> {
  if (!settings.projectInfo) {
    settings = {
      ...settings,
      projectInfo: { artifacts: [artifact] }
    };
  }
  let projectEncoder = await forProject(settings);
  return await projectEncoder.forArtifact(artifact);
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract encoder for a given contract.
 * @param contract The contract the encoder is for.  It should have all of
 *   its libraries linked.
 * @param settings The [[EncoderSettings]] to use; see the documentation for
 *   that type for more information.  If absent, the encoder will be based on
 *   just the single contract provided; it is recommended to pass more
 *   information to get the encoder's full power.
 * @category Truffle Contract-based Constructors
 */
export async function forContract(
  contract: ContractConstructorObject,
  settings: EncoderSettings = {}
): Promise<ContractEncoder> {
  return await forArtifact(contract, {
    provider: contract.web3.currentProvider,
    networkId: parseInt(contract.network_id) || undefined, //NaN is falsy :)
    ...settings
  });
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance encoder for a deployed contract instance.
 * You must pass in a provider or network ID to use this function.
 * @param artifact The artifact corresponding to the type of the contract.
 *
 *   A contract constructor object may be substituted for the artifact, so if
 *   you're not sure which you're dealing with, it's OK.
 * @param settings The [[EncoderSettings]] to use, including the provider or
 *   network id; see the documentation for that type for more information.
 * @category Constructors
 */
export async function forDeployedArtifact(
  artifact: Artifact,
  settings: EncoderSettings
): Promise<ContractInstanceEncoder> {
  let contractEncoder = await forArtifact(artifact, settings);
  let instanceEncoder = await contractEncoder.forInstance();
  return instanceEncoder;
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance encoder for a deployed contract instance.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param settings The [[EncoderSettings]] to use; see the documentation for
 *   that type for more information.  If absent, the encoder will be based on
 *   just the single contract provided; it is recommended to pass more
 *   information to get the encoder's full power.
 * @category Truffle Contract-based Constructors
 */
export async function forDeployedContract(
  contract: ContractConstructorObject,
  settings: EncoderSettings = {}
): Promise<ContractInstanceEncoder> {
  const contractEncoder = await forContract(contract, settings);
  return await contractEncoder.forInstance();
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance decoder for a contract instance at a given address.
 * @param artifact The artifact corresponding to the type of the contract.
 *
 *   A contract constructor object may be substituted for the artifact, so if
 *   you're not sure which you're dealing with, it's OK.
 * @param address The address of the contract instance to decode.
 *
 *   Address must either be checksummed, or in all one case to circumvent the checksum.
 *   Mixed-case with bad checksum will cause this function to throw an exception.
 * @param settings The [[EncoderSettings]] to use;
 *   see the documentation for that type for more information.  If absent, the
 *   encoder will be based on just the single contract provided; it is
 *   recommended to pass more information to get the encoder's full power.
 *
 *   Note that if the artifact contains unlinked libraries, you will have to
 *   pass either the `provider` or `networkId` setting in order to encode
 *   contract creation transactions.
 * @category Provider-based Constructor
 */
export async function forArtifactAt(
  artifact: Artifact,
  address: string,
  settings: EncoderSettings = {}
): Promise<ContractInstanceEncoder> {
  let contractEncoder = await forArtifact(artifact, settings);
  let instanceEncoder = await contractEncoder.forInstance(address);
  return instanceEncoder;
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance encoder for a contract instance at a given address.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param address The address of the contract instance to decode.
 *
 *   Address must either be checksummed, or in all one case to circumvent the checksum.
 *   Mixed-case with bad checksum will cause this function to throw an exception.
 * @param settings The [[EncoderSettings]] to use; see the documentation for
 *   that type for more information.  If absent, the encoder will be based on
 *   just the single contract provided; it is recommended to pass more
 *   information to get the encoder's full power.
 * @category Truffle Contract-based Constructors
 */
export async function forContractAt(
  contract: ContractConstructorObject,
  address: string,
  settings: EncoderSettings = {}
): Promise<ContractInstanceEncoder> {
  const contractEncoder = await forContract(contract, settings);
  return contractEncoder.forInstance(address);
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance encoder for a deployed contract instance.
 * @param contract The contract abstraction object corresponding to the contract instance.
 * @param settings The [[EncoderSettings]] to use; see the documentation for
 *   that type for more information.  If absent, the encoder will be based on
 *   just the single contract provided; it is recommended to pass more
 *   information to get the encoder's full power.
 * @category Truffle Contract-based Constructors
 */
export async function forContractInstance(
  contract: ContractInstanceObject,
  settings: EncoderSettings = {}
): Promise<ContractInstanceEncoder> {
  return forContractAt(contract.constructor, contract.address, settings);
}

/**
 * @category Constructors
 */
function ensSettingsForInfo(settings: EncoderSettings): EnsSettings {
  if (settings.ens) {
    return settings.ens;
  } else {
    return {
      provider: settings.provider
    };
  }
}

/**
 * @category Constructors
 */
async function networkIdForInfo(
  settings: EncoderSettings
): Promise<number | null> {
  if (settings.networkId !== undefined) {
    return settings.networkId;
  } else if (settings.provider) {
    return await new Web3(settings.provider).eth.net.getId();
  } else {
    return null;
  }
}

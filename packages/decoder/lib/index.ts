/**
# Truffle Decoder

This module provides an interface for decoding contract state, transaction
calldata, and events.  It's an interface to the same low-level decoding
functionality that Truffle Debugger uses.  However, it has additional
functionality that the debugger does not need, and the debugger has additional
functionality that this interface either does not need or cannot currently
replicate.  In the future, this interface will also decode return values and
revert strings.

The interface is split into three classes: The wire decoder, the contract
decoder, and the contract instance decoder.  The wire decoder is associated to
the project as a whole and decodes transaction calldata and events.  The
contract decoder is associated to a specific contract class.  It has all the
capabilities of the wire decoder, but in addition it acts as a factory for
contract instance decoders.  The contract instance decoder is associated to a
specific contract instance; it too has all the capabilities of the wire decoder,
but it can also decode the state variables for the specific instance.  (In
addition, in the case that the contract does not include a `deployedBytecode`
field in its artifact, which can hinder decoding certain things, the contract
instance decoder can sometimes work around this where the other decoders
cannot.)

This documentation describes the current state of the decoder, but you should
expect to see improvements soon.

## Usage

### Initialization

Create a decoder with one of the various constructor functions.

For a wire decoder, use the [[forProject|`forProject`]] function.

For a contract decoder, use the [[forArtifact|`forArtifact`]] or
[[forContract|`forContract`]] function.

For a contract instance decoder, use one of the following:
* [[forDeployedArtifact|`forDeployedArtifact`]]
* [[forDeployedContract|`forDeployedContract`]]
* [[forArtifactAt|`forArtifactAt`]]
* [[forContractAt|`forContractAt`]]
* [[forContractInstance|`forContractInstance`]]

See the documentation of these functions for details, or below for usage
examples.

All of these functions presently require a final argument containing all
artifacts that could potentially be relevant.  It's intended that this argument
will be optional in the future.

### Decoder methods

See the documentation for the individual decoder classes for a method listing.

### Output format information

The decoder outputs lossless, machine-readable [[Format.Values.Result]] objects
containing individual decoded values. See the [[Format|format documentation]]
for an overview and complete module listing.

### Decoding modes and abification

The decoder runs in either of two modes: full mode or ABI mdoe. Full mode
requires some additional constraints but returns substantially more detailed
information. Please see the notes on [decoding modes](../#decoding-modes) for
more about this distinction.

### Basic usage examples

#### Decoding a log with the wire decoder

This usage example is for a project with two contracts, `Contract1` and
`Contract2`.

```typescript
import { forProject } from "@truffle/decoder";
const contract1 = artifacts.require("Contract1");
const contract2 = artifacts.require("Contract2");
const provider = web3.currentProvider;
const decoder = await Decoder.forProject(provider, [contract1, contract2]);
const decodings = await decoder.decodeLog(log);
```

The usage of [[WireDecoder.decodeTransaction|decodeTransaction]] is similar.

For getting already-decoded logs meeting appropriate conditions, see
[[WireDecoder.events]].

#### Decoding state variables with the contract instance decoder

This usage example is for decoding the state variables of a contract `Contract`
in a project that also contains a contract `OtherContract`.

```typescript
import { forContract } from "@truffle/decoder";
const contract = artifacts.require("Contract");
const otherContract = artifacts.require("OtherContract");
const decoder = await Decoder.forContract(contract, [otherContract]);
const instanceDecoder = await decoder.forInstance();
const variables = await instanceDecoder.variables();
```

In this example, we use the deployed version of `Contract`.  If we wanted an
instance at a different address, we could pass the address to `forInstance`.

In addition, rather than using `forContract` and then `forInstance`, we could
also use [[forDeployedContract|`forContractInstance`]] to perform both of these
in one step.  If we wanted to do this with a specified address, we could use
[[forContractAt|`forContractAt`]].

Yet another way would be:
```typescript
import { forContractInstance } from "@truffle/decoder";
const contract = artifacts.require("Contract");
const otherContract = artifacts.require("OtherContract");
const deployedContract = await contract.deployed();
const instanceDecoder = await Decoder.forContractInstance(deployedContract, [otherContract]);
const variables = await instanceDecoder.variables();
```

These examples are not exhaustive.

One can find more advanced decoding examples with
[[ContractInstanceDecoder.variable|`variable`]] and
[[ContractInstanceDecoder.watchMappingKey|`watchMappingKey`]] at the
documentation for these individual functions.
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
  DecodedLog,
  EventOptions,
  Transaction,
  Log,
  BlockSpecifier
} from "./types";

import { Provider } from "@truffle/provider";
import { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import { ContractConstructorObject, ContractInstanceObject } from "./types";

/**
 * **This function is asynchronous.**
 *
 * Constructs a wire decoder for the project.
 * @param provider The Web3 provider object to use.
 * @param artifacts A list of contract artifacts for contracts in the project.
 *
 *   Contract constructor objects may be substituted for artifacts, so if
 *   you're not sure which you're dealing with, it's OK.
 *
 *   This parameter is intended to be made optional in the future.
 * @category Provider-based Constructor
 */
export async function forProject(
  provider: Provider,
  artifacts: Artifact[]
): Promise<WireDecoder> {
  return new WireDecoder(artifacts, provider);
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract decoder for a given contract artifact.
 * @param artifact The artifact for the contract.
 *
 *   A contract constructor object may be substituted for the artifact, so if
 *   you're not sure which you're dealing with, it's OK.
 * @param provider The Web3 provider object to use.
 * @param artifacts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   Contract constructor objects may be substituted for artifacts, so if
 *   you're not sure which you're dealing with, it's OK.
 *
 *   Including the contract itself here is fine; so is excluding it.
 *
 *   This parameter is intended to be made optional in the future.
 * @category Provider-based Constructor
 */
export async function forArtifact(
  artifact: Artifact,
  provider: Provider,
  artifacts: Artifact[]
): Promise<ContractDecoder> {
  artifacts = artifacts.includes(artifact)
    ? artifacts
    : [artifact, ...artifacts];
  let wireDecoder = await forProject(provider, artifacts);
  let contractDecoder = new ContractDecoder(artifact, wireDecoder);
  await contractDecoder.init();
  return contractDecoder;
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract decoder for a given contract.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param artifacts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   See the artifacts parameter documentation on [[forArtifact]] for more detail.
 *
 *   This parameter is intended to be made optional in the future.
 * @category Truffle Contract-based Constructor
 */
export async function forContract(
  contract: ContractConstructorObject,
  artifacts: Artifact[]
): Promise<ContractDecoder> {
  //HACK: again we have to work around web3's messed-up typing;
  //it for some reason is convinced that currentProvider is a string
  //rather than a Provider.
  return await forArtifact(
    contract,
    <Provider>contract.web3.currentProvider,
    artifacts
  );
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance decoder for a deployed contract instance.
 * @param artifact The artifact corresponding to the type of the contract.
 *
 *   A contract constructor object may be substituted for the artifact, so if
 *   you're not sure which you're dealing with, it's OK.
 * @param provider The Web3 provider object to use.
 * @param artifacts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   See the artifacts parameter documentation on [[forArtifact]] for more detail.
 *
 *   This parameter is intended to be made optional in the future.
 * @category Provider-based Constructor
 */
export async function forDeployedArtifact(
  artifact: Artifact,
  provider: Provider,
  artifacts: Artifact[]
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forArtifact(artifact, provider, artifacts);
  let instanceDecoder = await contractDecoder.forInstance();
  return instanceDecoder;
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance decoder for a deployed contract instance.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param artifacts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   See the artifacts parameter documentation on [[forArtifact]] for more detail.
 *
 *   This parameter is intended to be made optional in the future.
 * @category Truffle Contract-based Constructor
 */
export async function forDeployedContract(
  contract: ContractConstructorObject,
  artifacts: Artifact[]
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forContract(contract, artifacts);
  let instanceDecoder = await contractDecoder.forInstance();
  return instanceDecoder;
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance decoder for a contract instance at a given address.
 * @param artifact The artifact corresponding to the type of the contract.
 *
 *   A contract constructor object may be substituted for the artifact, so if
 *   you're not sure which you're dealing with, it's OK.
 * @param provider The Web3 provider object to use.
 * @param address The address of the contract instance to decode.
 *
 *   Address must either be checksummed, or in all one case to circumvent the checksum.
 *   Mixed-case with bad checksum will cause this function to throw an exception.
 * @param artifacts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   See the artifacts parameter documentation on [[forArtifact]] for more detail.
 *
 *   This parameter is intended to be made optional in the future.
 * @category Provider-based Constructor
 */
export async function forArtifactAt(
  artifact: Artifact,
  provider: Provider,
  address: string,
  artifacts: Artifact[]
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forArtifact(artifact, provider, artifacts);
  let instanceDecoder = await contractDecoder.forInstance(address);
  return instanceDecoder;
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance decoder for a contract instance at a given address.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param address The address of the contract instance to decode.
 *
 *   Address must either be checksummed, or in all one case to circumvent the checksum.
 *   Mixed-case with bad checksum will cause this function to throw an exception.
 * @param artifacts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   See the artifacts parameter documentation on [[forArtifact]] for more detail.
 *
 *   This parameter is intended to be made optional in the future.
 * @category Truffle Contract-based Constructor
 */
export async function forContractAt(
  contract: ContractConstructorObject,
  address: string,
  artifacts: Artifact[]
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forContract(contract, artifacts);
  let instanceDecoder = await contractDecoder.forInstance(address);
  return instanceDecoder;
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance decoder for a given contract instance.
 * @param contract The contract abstraction object corresponding to the contract instance.
 * @param artifacts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 *
 *   See the artifacts parameter documentation on [[forArtifact]] for more detail.
 *
 *   This parameter is intended to be made optional in the future.
 * @category Truffle Contract-based Constructor
 */
export async function forContractInstance(
  contract: ContractInstanceObject,
  artifacts: Artifact[]
): Promise<ContractInstanceDecoder> {
  return await forContractAt(contract.constructor, contract.address, artifacts);
}

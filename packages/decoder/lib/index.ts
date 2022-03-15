/**
# Truffle Decoder

This module provides an interface for decoding contract state, transaction
calldata, events, and return values and revert strings.  It's an interface to
the same low-level decoding functionality that Truffle Debugger uses.  However,
it has additional functionality that the debugger does not need, and the
debugger has additional functionality that this decoder does not need.

The interface is split into three classes: The project decoder, the contract
decoder, and the contract instance decoder.  The project decoder is associated
to the project as a whole and decodes transaction calldata and events.  The
contract decoder is associated to a specific contract class.  It has all the
capabilities of the project decoder, but it can also decode return values from
calls made by the given contract class.  The contract instance decoder is
associated to a specific contract instance; it again has all the capabilities
of the project decoder and contract decoder, but it can also decode the state
variables for the specific instance.  (In addition, in the case that the
contract does not include a `deployedBytecode` field in its artifact, which can
hinder decoding certain things, the contract instance decoder can sometimes
work around this where the other decoders cannot.)

This documentation describes the current state of the decoder, but further
improvements are planned.

## Usage

### Initialization

Create a decoder with one of the various constructor functions.

For a project decoder, use the [[forProject|`forProject`]] function.

For a contract decoder, use the [[forArtifact|`forArtifact`]] or
[[forContract|`forContract`]] function.

For a contract instance decoder, use one of the following:
* [[forDeployedArtifact|`forDeployedArtifact`]]
* [[forDeployedContract|`forDeployedContract`]]
* [[forArtifactAt|`forArtifactAt`]]
* [[forContractAt|`forContractAt`]]
* [[forContractInstance|`forContractInstance`]]
* [[forAddress|`forAddress`]]

See the documentation of these functions for details, or below for usage
examples.

All of these functions take a final argument in which information about the
project is specified; currently only a few methods for specifying project
information are allowed, but more are planned.

One can also spawn decoders from other decoders by supplying additional
information.  See the documentation for the individual decoder classes for a
method listing.

### Decoder methods

See the documentation for the individual decoder classes for a method listing.

### Output format information

The decoder outputs lossless, machine-readable [[Format.Values.Result]] objects
containing individual decoded values. See the [[Format|format documentation]]
for an overview and complete module listing.

### Decoding modes, abification, and caveats

The decoder runs in either of two modes: full mode or ABI mode. Full mode
requires some additional constraints but returns substantially more detailed
information. Please see the notes on [decoding modes](../#decoding-modes) for
more about this distinction.

See also the notes about [decoding state variables](../#additional-notes-on-decoding-state-variables) for additional
caveats about what may or may not be fully decodable.

### Basic usage examples

#### Decoding a log with the project decoder

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

The usage of [[ProjectDecoder.decodeTransaction|decodeTransaction]] is similar.

For getting already-decoded logs meeting appropriate conditions, see
[[ProjectDecoder.events]].

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
 * @packageDocumentation
 */

import {
  ContractDecoder,
  ContractInstanceDecoder,
  ProjectDecoder
} from "./decoders";
export { ContractDecoder, ContractInstanceDecoder, ProjectDecoder };

export {
  ContractBeingDecodedHasNoNodeError,
  ContractNotFoundError,
  ContractAllocationFailedError,
  InvalidAddressError,
  VariableNotFoundError,
  NoProviderError
} from "./errors";

export type {
  ContractState,
  StateVariable,
  DecodedLog,
  EventOptions,
  ReturnOptions,
  DecodeLogOptions,
  ExtrasAllowed,
  Transaction,
  Log
} from "./types";
import type { EnsSettings, DecoderSettings } from "./types";
export { EnsSettings, DecoderSettings };

import type { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import type {
  ContractConstructorObject,
  ContractInstanceObject
} from "./types";

import { Compilations } from "@truffle/codec";

type ProjectInfo = Compilations.ProjectInfo;
export { ProjectInfo };

/**
 * **This function is asynchronous.**
 *
 * Constructs a project decoder for the project.
 * See the [[DecoderSettings]] documentation for further information.
 * @category Provider-based Constructor
 */
export async function forProject(
  settings: DecoderSettings
): Promise<ProjectDecoder> {
  let compilations = Compilations.Utils.infoToCompilations(
    settings.projectInfo
  );
  let ensSettings = ensSettingsForInfo(settings);
  return new ProjectDecoder(compilations, settings.provider, ensSettings);
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract decoder for a given contract artifact.
 * @param artifact The artifact for the contract.
 *
 *   A contract constructor object may be substituted for the artifact, so if
 *   you're not sure which you're dealing with, it's OK.
 * @param settings The [[DecoderSettings]] to use, including the provider;
 *   see the documentation for that type for more information.
 * @category Provider-based Constructor
 */
export async function forArtifact(
  artifact: Artifact,
  settings: DecoderSettings
): Promise<ContractDecoder> {
  if (!settings.projectInfo) {
    settings = {
      ...settings,
      projectInfo: { artifacts: [artifact] }
    };
  }
  let projectDecoder = await forProject(settings);
  return await projectDecoder.forArtifact(artifact);
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract decoder for a given contract.
 * @param contract The contract constructor object corresponding to the type of
 *   the contract.
 * @param settings The [[DecoderSettings]] to use; see the documentation for
 *   that type for more information.  If absent, the decoder will be based on
 *   just the single contract provided; it is recommended to pass more
 *   information to get the decoder's full power.
 * @category Truffle Contract-based Constructor
 */
export async function forContract(
  contract: ContractConstructorObject,
  settings: DecoderSettings = {}
): Promise<ContractDecoder> {
  return await forArtifact(contract, {
    provider: contract.web3.currentProvider,
    ...settings
  });
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance decoder for a deployed contract instance.
 * @param artifact The artifact corresponding to the type of the contract.
 *
 *   A contract constructor object may be substituted for the artifact, so if
 *   you're not sure which you're dealing with, it's OK.
 * @param settings The [[DecoderSettings]] to use, including the provider;
 *   see the documentation for that type for more information.
 * @category Provider-based Constructor
 */
export async function forDeployedArtifact(
  artifact: Artifact,
  settings: DecoderSettings
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forArtifact(artifact, settings);
  let instanceDecoder = await contractDecoder.forInstance();
  return instanceDecoder;
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance decoder for a deployed contract instance.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param settings The [[DecoderSettings]] to use; see the documentation for
 *   that type for more information.  If absent, the decoder will be based on just the
 *   single contract provided; it is recommended to pass more information to get the
 *   decoder's full power.
 * @category Truffle Contract-based Constructor
 */
export async function forDeployedContract(
  contract: ContractConstructorObject,
  settings: DecoderSettings = {}
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forContract(contract, settings);
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
 * @param address The address of the contract instance to decode.
 *
 *   Address must either be checksummed, or in all one case to circumvent the checksum.
 *   Mixed-case with bad checksum will cause this function to throw an exception.
 * @param settings The [[DecoderSettings]] to use, including the provider;
 *   see the documentation for that type for more information.
 * @category Provider-based Constructor
 */
export async function forArtifactAt(
  artifact: Artifact,
  address: string,
  settings: DecoderSettings
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forArtifact(artifact, settings);
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
 * @param settings The [[DecoderSettings]] to use; see the documentation for
 *   that type for more information.  If absent, the decoder will be based on just the
 *   single contract provided; it is recommended to pass more information to get the
 *   decoder's full power.
 * @category Truffle Contract-based Constructor
 */
export async function forContractAt(
  contract: ContractConstructorObject,
  address: string,
  settings: DecoderSettings = {}
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forContract(contract, settings);
  let instanceDecoder = await contractDecoder.forInstance(address);
  return instanceDecoder;
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance decoder for a given contract instance.
 * @param contract The contract abstraction object corresponding to the contract instance.
 * @param settings The [[DecoderSettings]] to use; see the documentation for
 *   that type for more information.  If absent, the decoder will be based on just the
 *   single contract provided; it is recommended to pass more information to get the
 *   decoder's full power.
 * @category Truffle Contract-based Constructor
 */
export async function forContractInstance(
  contract: ContractInstanceObject,
  settings: DecoderSettings = {}
): Promise<ContractInstanceDecoder> {
  return await forContractAt(contract.constructor, contract.address, settings);
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance decoder for a given instance of a contract in this
 * project.  Unlike the other functions, this method doesn't require giving an
 * artifact for the address itself; however, the address had better correspond to
 * a contract of a type given in the project info, or you'll get an exception.
 * @param address The address of the contract instance to decode.
 *   If an invalid address is provided, this method will throw an exception.
 * @param settings The [[DecoderSettings]] to use, including the provider;
 *   see the documentation for that type for more information.
 * @category Provider-based Constructor
 */
export async function forAddress(
  address: string,
  settings: DecoderSettings = {}
): Promise<ContractInstanceDecoder> {
  let projectDecoder = await forProject(settings);
  return await projectDecoder.forAddress(address);
}

//warning: copypasted from @truffle/encoder!
//Also the category is fake but is put here to hide it :P
/**
 * @category Provider-based constructor
 */
function ensSettingsForInfo(settings: DecoderSettings): EnsSettings {
  if (settings.ens) {
    return settings.ens;
  } else {
    return {
      provider: settings.provider
    };
  }
}

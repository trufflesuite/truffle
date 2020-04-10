/**
# Truffle Decoder

This module provides an interface for decoding contract state, transaction
calldata, events, and return values and revert strings.  It's an interface to
the same low-level decoding functionality that Truffle Debugger uses.  However,
it has additional functionality that the debugger does not need, and the
debugger has additional functionality that this decoder does not need.

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

import "source-map-support/register";

import {
  ContractDecoder,
  ContractInstanceDecoder,
  WireDecoder
} from "./decoders";
export { ContractDecoder, ContractInstanceDecoder, WireDecoder };

export {
  ContractBeingDecodedHasNoNodeError,
  ContractNotFoundError,
  ContractAllocationFailedError,
  InvalidAddressError,
  VariableNotFoundError
} from "./errors";
import { NoProjectInfoError } from "./errors";
export { NoProjectInfoError };

export {
  ContractState,
  StateVariable,
  DecodedLog,
  EventOptions,
  ReturnOptions,
  Transaction,
  Log,
  BlockSpecifier
} from "./types";
import { ProjectInfo } from "./types";
export { ProjectInfo };

import { Provider } from "web3/providers";
import { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import { ContractConstructorObject, ContractInstanceObject } from "./types";

import { Compilations } from "@truffle/codec";

import fs from "fs";
import path from "path";

/**
 * **This function is asynchronous.**
 *
 * Constructs a wire decoder for the project.
 * @param provider The Web3 provider object to use.
 * @param projectInfo Information about the project or contracts being decoded.
 *   This may come in several forms; see the [[ProjectInfo]] documentation for
 *   more information.
 *
 *   Alternatively, instead of a [[ProjectInfo]], one may simply pass a list of
 *   artifacts.  Contract constructor objects may be substituted for artifacts,
 *   so if you're not sure which you're dealing with, it's OK.  If this parameter
 *   is omitted, it's treated as if one had passed `[]`.
 * @category Provider-based Constructor
 */
export async function forProject(
  provider: Provider,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<WireDecoder> {
  let compilations = infoToCompilations(projectInfo);
  return new WireDecoder(compilations, provider);
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
 * @param projectInfo Information about the project being decoded, or just the
 *   contracts relevant to the contract being decoded (e.g., by providing struct
 *   or enum definitions, or even just appearing as a contract type).  This may
 *   come in several forms; see the [[ProjectInfo]] documentation for more
 *   information.
 *
 *   Alternatively, instead of a [[ProjectInfo]], one may simply pass a list of
 *   artifacts.  Contract constructor objects may be substituted for artifacts,
 *   so if you're not sure which you're dealing with, it's OK.
 *
 *   If this latter option is used, one may omit `artifact` itself from the
 *   list of artifacts and only include the *other* relevant artifacts; note
 *   that omission this is not allowed when passing a `ProjectInfo`.
 *
 *   If this parameter is omitted, it's treated as if one had passed `[]`.
 * @category Provider-based Constructor
 */
export async function forArtifact(
  artifact: Artifact,
  provider: Provider,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ContractDecoder> {
  let compilations = infoToCompilations(projectInfo, artifact);
  let wireDecoder = await forProject(provider, { compilations });
  return await wireDecoder.forArtifact(artifact);
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract decoder for a given contract.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param artifacts A list of artifacts for other contracts in the project that may be relevant
 *   (e.g., providing needed struct or enum definitions, or appearing as a contract type).
 * @param projectInfo Information about the project being decoded, or just the
 *   contracts relevant to the contract being decoded (e.g., by providing struct
 *   or enum definitions, or even just appearing as a contract type).  This may
 *   come in several forms. See the [[ProjectInfo]] documentation for more
 *   information.  See the projectInfo parameter documentation on [[forArtifact]]
 *   for more detail.
 * @category Truffle Contract-based Constructor
 */
export async function forContract(
  contract: ContractConstructorObject,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ContractDecoder> {
  return await forArtifact(
    contract,
    contract.web3.currentProvider,
    projectInfo
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
 * @param projectInfo Information about the project being decoded, or just the
 *   contracts relevant to the contract being decoded (e.g., by providing struct
 *   or enum definitions, or even just appearing as a contract type).  This may
 *   come in several forms. see the [[ProjectInfo]] documentation for more
 *   information.  See the projectInfo parameter documentation on [[forArtifact]]
 *   for more detail.
 * @category Provider-based Constructor
 */
export async function forDeployedArtifact(
  artifact: Artifact,
  provider: Provider,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forArtifact(artifact, provider, projectInfo);
  let instanceDecoder = await contractDecoder.forInstance();
  return instanceDecoder;
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance decoder for a deployed contract instance.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param projectInfo Information about the project being decoded, or just the
 *   contracts relevant to the contract being decoded (e.g., by providing struct
 *   or enum definitions, or even just appearing as a contract type).  This may
 *   come in several forms. see the [[ProjectInfo]] documentation for more
 *   information.  See the projectInfo parameter documentation on [[forArtifact]]
 *   for more detail.
 * @category Truffle Contract-based Constructor
 */
export async function forDeployedContract(
  contract: ContractConstructorObject,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forContract(contract, projectInfo);
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
 * @param projectInfo Information about the project being decoded, or just the
 *   contracts relevant to the contract being decoded (e.g., by providing struct
 *   or enum definitions, or even just appearing as a contract type).  This may
 *   come in several forms. see the [[ProjectInfo]] documentation for more
 *   information.  See the projectInfo parameter documentation on [[forArtifact]]
 *   for more detail.
 * @category Provider-based Constructor
 */
export async function forArtifactAt(
  artifact: Artifact,
  provider: Provider,
  address: string,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forArtifact(artifact, provider, projectInfo);
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
 * @param projectInfo Information about the project being decoded, or just the
 *   contracts relevant to the contract being decoded (e.g., by providing struct
 *   or enum definitions, or even just appearing as a contract type).  This may
 *   come in several forms. see the [[ProjectInfo]] documentation for more
 *   information.  See the projectInfo parameter documentation on [[forArtifact]]
 *   for more detail.
 * @category Truffle Contract-based Constructor
 */
export async function forContractAt(
  contract: ContractConstructorObject,
  address: string,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ContractInstanceDecoder> {
  let contractDecoder = await forContract(contract, projectInfo);
  let instanceDecoder = await contractDecoder.forInstance(address);
  return instanceDecoder;
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance decoder for a given contract instance.
 * @param contract The contract abstraction object corresponding to the contract instance.
 * @param projectInfo Information about the project being decoded, or just the
 *   contracts relevant to the contract being decoded (e.g., by providing struct
 *   or enum definitions, or even just appearing as a contract type).  This may
 *   come in several forms. see the [[ProjectInfo]] documentation for more
 *   information.  See the projectInfo parameter documentation on [[forArtifact]]
 *   for more detail.
 * @category Truffle Contract-based Constructor
 */
export async function forContractInstance(
  contract: ContractInstanceObject,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ContractInstanceDecoder> {
  return await forContractAt(
    contract.constructor,
    contract.address,
    projectInfo
  );
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
 * @param provider The Web3 provider object to use.
 * @param projectInfo Information about the project being decoded, or just the
 *   contracts relevant to the contract being decoded (e.g., by providing struct
 *   or enum definitions, or even just appearing as a contract type).  This may
 *   come in several forms. See the [[ProjectInfo]] documentation for more
 *   information.  See the projectInfo parameter documentation on [[forProject]]
 *   for more detail.
 * @category Provider-based Constructor
 */
export async function forAddress(
  address: string,
  provider: Provider,
  projectInfo: ProjectInfo | Artifact[]
): Promise<ContractInstanceDecoder> {
  let wireDecoder = await forProject(provider, projectInfo);
  return await wireDecoder.forAddress(address);
}

//Note: this function doesn't actually go in this category, but
//I don't want an unsightly "Other functions" thing appearing,
//so I'm hiding it here :)
/**
 * @category Provider-based Constructor
 */
function infoToCompilations(
  info: ProjectInfo | Artifact[],
  primaryArtifact?: Artifact
): Compilations.Compilation[] {
  if (!info) {
    info = [];
  }
  if (Array.isArray(info)) {
    let artifacts = info;
    if (
      primaryArtifact &&
      !artifacts.find(
        artifact =>
          artifact === primaryArtifact ||
          artifact.contractName === primaryArtifact.contractName
      )
    ) {
      artifacts = [primaryArtifact, ...artifacts];
    }
    return Compilations.Utils.shimArtifacts(artifacts);
  } else {
    let projectInfo: ProjectInfo = info;
    if (projectInfo.compilations) {
      return projectInfo.compilations;
    } else if (projectInfo.artifacts) {
      return Compilations.Utils.shimArtifacts(projectInfo.artifacts);
    } else if (projectInfo.config) {
      //NOTE: This will be expanded in the future so that it's not just
      //using the build directory
      if (projectInfo.config.contracts_build_directory !== undefined) {
        let files = fs
          .readdirSync(projectInfo.config.contracts_build_directory)
          .filter(file => path.extname(file) === ".json");
        let data = files.map(file =>
          fs.readFileSync(
            path.join(projectInfo.config.contracts_build_directory, file),
            "utf8"
          )
        );
        let artifacts = data.map(json => JSON.parse(json));
        return Compilations.Utils.shimArtifacts(artifacts);
      } else {
        throw new NoProjectInfoError();
      }
    } else {
      throw new NoProjectInfoError();
    }
  }
}

/**
# Truffle Encoder

This module provides an interface for recognizing JavaScript user input of
Solidity values, encoding those values for use in a transaction, and performing
overload resolution based on those values to determine which Solidity method to
encode for.

The interface is split into three classes: The project encoder, the contract
encoder, and the contract instance encoder.  The project encoder is associated
to the project as a whole; it can recognize user input, encode transactions,
and resolve overloads, although the interface for the latter two is somewhat
inconvenient.  The contract encoder is associated to a specific contract class.
It is similar to the project encoder, but presents an easier-to-use interface
for transaction encoding and overload resolution, so long as one is dealing
with methods of the specified class.  The contract instance encoder is
associated to a specific contract instance; it is like the contract encoder,
but is associated to a specific address, allowing the `to` option in
transactions to be populated automatically.

## Usage

### Initialization

Create a encoder with one of the various constructor functions.

For a project encoder, use the [[forProject|`forProject`]] function.

For a contract encoder, use the [[forContract|`forContract`]] function.

For a contract instance encoder, use one of the following:
* [[forDeployedContract|`forDeployedContract`]]
* [[forContractAt|`forContractAt`]]
* [[forContractInstance|`forContractInstance`]]

See the documentation of these functions for details, or below for usage
examples.

All of these functions take a final argument in which information about the
project is specified; currently only a few methods for specifying project
information are allowed, but more are planned.

One can also spawn encoders from other encoders by supplying additional
information.  See the documentation for the individual encoder classes for a
method listing.

### Encoder methods

See the documentation for the individual encoder classes for a method listing.

### Wrapped format information

When using the various "wrap" functions, values will be wrapped in
machine-readable [[Format.Values.Value]] objects containing individual wrapped
values.  (This is the same format that `@truffle/decoder` produces output in.)
See the [[Format|format documentation]] for an overview and complete module
listing.

### Use of project information and encoding of enums

The encoder can do purely ABI-based encoding, like other encoders; however it
has the capability to use project information to do more.

The most significant use of this is that if further project information is
present, this allows for enums to be entered as strings with the name of
the option, rather than having to be entered via the underlying number.
See the documentation of [[ProjectEncoder.wrap]] for more.

Similarly, if project information is present, the encoder will also throw an
error if you attempt to put an out-of-range value into an enum type, and
refuse to consider overloads that would result in this during overload
resolution.  If project information is absent, the encoder will be unable to
recognize any error in these situations.

### ENS resolution

The encoder supports ENS resolution for address and contract types if
initialized to support such.  See the documentation of the [[ProjectInfo]]
and [[EnsSettings]] types for more.

### Basic usage examples

These usage examples are for a project with two contracts, `Contract1` and
`Contract2`.  Let's suppose these look like the following:

```solidity
pragma solidity ^0.8.0;

contract Contract1 {
  function enumExample(Contract2.Ternary x) public payable {
  }

  function overloaded(uint x) public payable {
  }

  function overloaded(string x) public payable {
  }
}

contract Contract2 {
  enum Ternary { No, Yes, Maybe }
}
```

#### Encoding a transaction

```typescript
import { forContract } from "@truffle/encoder";
const contract1 = artifacts.require("Contract1");
const contract2 = artifacts.require("Contract2");
const encoder = await Encoder.forContract(Contract1, [Contract1, Contract2]);
const abi = Contract1.abi.find(abiEntry => abiEntry.name === "enumExample");
const tx = await encoder.encodeTransaction(
  abi,
  ["Maybe", { value: 1 }],
  { allowOptions: true }
);
```

### Performing overload resolution

```typescript
import { forContract } from "@truffle/encoder";
const contract1 = artifacts.require("Contract1");
const contract2 = artifacts.require("Contract2");
const encoder = await Encoder.forContract(Contract1, [Contract1, Contract2]);
const abis = Contract1.abi.filter(abiEntry => abiEntry.name === "overloaded");
const { tx, abi } = await encoder.encodeTransaction(
  abis,
  ["hello", { value: 1 }],
  { allowOptions: true }
);
```
 *
 * @module @truffle/encoder
 */ /** */

import {
  ProjectEncoder,
  ContractEncoder,
  ContractInstanceEncoder
} from "./encoders";
export { ProjectEncoder, ContractEncoder, ContractInstanceEncoder };

import type {
  ProjectInfo,
  EnsSettings,
  EncoderInfoInternal,
  TxAndAbi
} from "./types";
export { ProjectInfo, EnsSettings, TxAndAbi };
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
  ContractNotFoundError
} from "./errors";
import { NoProjectInfoError } from "./errors";
export { NoProjectInfoError };

import { Compilations } from "@truffle/codec";
import fs from "fs";
import path from "path";

/**
 * **This function is asynchronous.**
 *
 * Constructs a project encoder for the project.
 * @param projectInfo Information about the project, potentially
 *   including a provider for ENS resolution.
 *   This may come in several forms; see the [[ProjectInfo]] documentation for
 *   more information.
 *
 *   Alternatively, instead of a [[ProjectInfo]], one may simply pass a list of
 *   artifacts.  Contract constructor objects may be substituted for artifacts,
 *   so if you're not sure which you're dealing with, it's OK.  If this parameter
 *   is omitted, it's treated as if one had passed `[]`.
 * @category Constructors
 */
export async function forProject(
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ProjectEncoder> {
  const compilations = infoToCompilations(projectInfo);
  const ens = ensSettingsForInfo(projectInfo);
  const encoder = new ProjectEncoder({ compilations, ...ens });
  await encoder.init();
  return encoder;
}

/**
 * @protected
 */
export async function forProjectInternal(
  info: EncoderInfoInternal
): Promise <ProjectEncoder> {
  const encoder = new ProjectEncoder(info);
  await encoder.init();
  return encoder;
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract encoder for a given contract.
 * @param contract The contract the encoder is for.  It should have all of
 *   its libraries linked.
 * @param projectInfo Information about the project, potentially
 *   including a provider for ENS resolution.
 *   This may come in several forms; see the [[ProjectInfo]] documentation for
 *   more information.
 *
 *   Alternatively, instead of a [[ProjectInfo]], one may simply pass a list of
 *   artifacts.  Contract constructor objects may be substituted for artifacts,
 *   so if you're not sure which you're dealing with, it's OK.  If this parameter
 *   is omitted, it's treated as if one had passed `[]`.
 * @param projectInfo Information about the project (potentially including a
 *   provider for ENS resolution), or just the
 *   contracts relevant to the contract (e.g., by providing struct
 *   or enum definitions, or even just appearing as a contract type).  This may
 *   come in several forms; see the [[ProjectInfo]] documentation for more
 *   information.
 *
 *   Alternatively, instead of a [[ProjectInfo]], one may simply pass a list of
 *   artifacts.  Contract constructor objects may be substituted for artifacts,
 *   so if you're not sure which you're dealing with, it's OK.
 *
 *   If this latter option is used, one may omit `contract` itself from the
 *   list of artifacts and only include the *other* relevant artifacts; note
 *   that omission this is not allowed when passing a `ProjectInfo`.
 *
 *   If this parameter is omitted, it's treated as if one had passed `[]`.
 * @category Constructors
 */
export async function forContract(
  contract: ContractConstructorObject,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ContractEncoder> {
  const compilations = infoToCompilations(projectInfo, contract);
  const ens = ensSettingsForInfo(projectInfo);
  const projectEncoder = new ProjectEncoder({ compilations, ...ens });
  await projectEncoder.init();
  return projectEncoder.forContract(contract);
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance encoder for a deployed contract instance.
 * @param contract The contract constructor object corresponding to the type of the contract.
 * @param projectInfo Information about the project, or just the
 *   contracts relevant to the contract (e.g., by providing struct
 *   or enum definitions, or even just appearing as a contract type).  This may
 *   come in several forms. see the [[ProjectInfo]] documentation for more
 *   information.  See the projectInfo parameter documentation on [[forArtifact]]
 *   for more detail.
 * @category Truffle Constructors
 */
export async function forDeployedContract(
  contract: ContractConstructorObject,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ContractInstanceEncoder> {
  const contractEncoder = await forContract(contract, projectInfo);
  return await contractEncoder.forInstance();
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
 * @param projectInfo Information about the project, or just the
 *   contracts relevant to the contract (e.g., by providing struct
 *   or enum definitions, or even just appearing as a contract type).  This may
 *   come in several forms. see the [[ProjectInfo]] documentation for more
 *   information.  See the projectInfo parameter documentation on [[forArtifact]]
 *   for more detail.
 * @category Constructors
 */
export async function forContractAt(
  contract: ContractConstructorObject,
  address: string,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ContractInstanceEncoder> {
  const contractEncoder = await forContract(contract, projectInfo);
  return contractEncoder.forInstance(address);
}

/**
 * **This function is asynchronous.**
 *
 * Constructs a contract instance encoder for a deployed contract instance.
 * @param contract The contract abstraction object corresponding to the contract instance.
 * @param projectInfo Information about the project, or just the
 *   contracts relevant to the contract (e.g., by providing struct
 *   or enum definitions, or even just appearing as a contract type).  This may
 *   come in several forms. see the [[ProjectInfo]] documentation for more
 *   information.  See the projectInfo parameter documentation on [[forArtifact]]
 *   for more detail.
 * @category Constructors
 */
export async function forContractInstance(
  contract: ContractInstanceObject,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ContractInstanceEncoder> {
  return forContractAt(contract.constructor, contract.address, projectInfo);
}

/**
 * @category Constructors
 */
function ensSettingsForInfo(
  projectInfo: ProjectInfo | Artifact[] | undefined
): EnsSettings | undefined {
  return projectInfo
    ? Array.isArray(projectInfo)
      ? undefined
      : projectInfo.ens
    : undefined;
}

//WARNING: copypasted from decoder!
/**
 * @category Constructors
 */
function infoToCompilations(
  info: ProjectInfo | Artifact[] | undefined,
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

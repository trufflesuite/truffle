/**
# Truffle Encoder
Write text here, TODO
* @module @truffle/encoder
*/ /** */

import {
  ProjectEncoder,
  ContractEncoder,
  ContractInstanceEncoder
} from "./encoders";
export { ProjectEncoder, ContractEncoder, ContractInstanceEncoder };

import type { ProjectInfo, EnsSettings, EncoderInfoInternal } from "./types";
export { ProjectInfo, EnsSettings };
export type { ResolveOptions } from "./types";
import type {
  ContractInstanceObject,
  ContractConstructorObject
} from "./types";
import type { ContractObject as Artifact } from "@truffle/contract-schema/spec";

export {
  InvalidAddressError
} from "./errors";
import { NoProjectInfoError } from "./errors";
export { NoProjectInfoError };

import { Compilations } from "@truffle/codec";
import fs from "fs";
import path from "path";

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
 *
 * @protected
 */
export async function forProjectInternal(
  info: EncoderInfoInternal
): Promise <ProjectEncoder> {
  const encoder = new ProjectEncoder(info);
  await encoder.init();
  return encoder;
}

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

export async function forDeployedContract(
  contract: ContractConstructorObject,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ContractInstanceEncoder> {
  const contractEncoder = await forContract(contract, projectInfo);
  return await contractEncoder.forInstance();
}

export async function forContractAt(
  contract: ContractConstructorObject,
  address: string,
  projectInfo?: ProjectInfo | Artifact[]
): Promise<ContractInstanceEncoder> {
  const contractEncoder = await forContract(contract, projectInfo);
  return contractEncoder.forInstance(address);
}

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

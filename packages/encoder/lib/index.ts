/**
# Truffle Encoder
Write text here, TODO
* @module @truffle/encoder
*/ /** */

import { Encoder, ContractEncoder } from "./encoder";
export { Encoder, ContractEncoder };

import type { EncoderInfo } from "./types";
export { EncoderInfo };
export type { ResolveOptions } from "./types";
import type {
  ContractInstanceObject,
  ContractConstructorObject
} from "./types";

import * as Codec from "@truffle/codec";

export async function forProject(info: EncoderInfo): Promise<Encoder> {
  const encoder = new Encoder(info);
  await encoder.init();
  return encoder;
}

export async function forContract(
  contract: ContractConstructorObject,
  info?: EncoderInfo
): Promise<ContractEncoder> {
  if (!info) {
    info = { compilations: Codec.Compilations.Utils.shimArtifacts([contract]) };
  }
  const encoder = await forProject(info);
  return encoder.forContract(contract);
}

export async function forContractAt(
  contract: ContractConstructorObject,
  address: string,
  info?: EncoderInfo
): Promise<ContractEncoder> {
  if (!info) {
    info = { compilations: Codec.Compilations.Utils.shimArtifacts([contract]) };
  }
  const encoder = await forProject(info);
  return encoder.forContractAt(contract, address);
}

export async function forContractInstance(
  contract: ContractInstanceObject,
  info?: EncoderInfo
): Promise<ContractEncoder> {
  if (!info) {
    info = {
      compilations: Codec.Compilations.Utils.shimArtifacts([
        contract.constructor
      ])
    };
  }
  const encoder = await forProject(info);
  return await encoder.forInstance(contract);
}

import type { Provider } from "web3/providers";
import type { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import type { Compilations, Format, Evm } from "@truffle/codec";

export interface ResolveOptions {
  allowOptions?: boolean;
}

export interface EncoderInfo {
  userDefinedTypes?: Format.Types.TypesById;
  allocations?: Evm.AllocationInfo;
  compilations?: Compilations.Compilation[];
  provider?: Provider;
  registryAddress?: string;
}

//HACK
export interface ContractConstructorObject extends Artifact {
  binary: string; //this exists as a getter, and is the only additional
  //thing we care about
}

//HACK
export interface ContractInstanceObject {
  constructor: ContractConstructorObject;
  address: string;
}

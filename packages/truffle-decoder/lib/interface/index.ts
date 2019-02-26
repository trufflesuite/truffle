import { AstDefinition } from "truffle-decode-utils";
import { DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import decode from "../decode";
import TruffleDecoder from "./contract-decoder";
import { ContractObject } from "truffle-contract-schema/spec";
import { Provider } from "web3/providers";

export { getStorageAllocations, storageSize } from "../allocate/storage";
export { readStack } from "../read/stack";
export { slotAddress } from "../read/storage";

export function forContract(contract: ContractObject, inheritedContracts: ContractObject[], provider: Provider): TruffleDecoder {
  return new TruffleDecoder(contract, inheritedContracts, provider);
}

export async function forEvmState(definition: AstDefinition, pointer: DataPointer, info: EvmInfo, providerUrl?: string): Promise<any> {
  return await decode(definition, pointer, info);
}

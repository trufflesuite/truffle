import { AstDefinition } from "truffle-decode-utils";
import { DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import decode from "../decode";
import TruffleDecoder from "./contract-decoder";
import { ContractObject } from "truffle-contract-schema/spec";
import { Provider } from "web3/providers";

export { getStorageAllocations, storageSize } from "../allocate/storage";
export { getCalldataAllocations } from "../allocate/calldata";
export { getMemoryAllocations } from "../allocate/memory";
export { readStack } from "../read/stack";
export { slotAddress } from "../read/storage";

export function forContract(contract: ContractObject, relevantContracts: ContractObject[], provider: Provider): TruffleDecoder {
  return new TruffleDecoder(contract, relevantContracts, provider);
}

export async function forEvmState(definition: AstDefinition, pointer: DataPointer, info: EvmInfo): Promise<any> {
  return await decode(definition, pointer, info);
}

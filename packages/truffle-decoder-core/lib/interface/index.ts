import { AstDefinition, Values } from "truffle-decode-utils";
import { DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import decode from "../decode";
import { DecoderRequest, GeneratorJunk } from "../types/request";

export { getStorageAllocations, storageSize } from "../allocate/storage";
export { getCalldataAllocations } from "../allocate/calldata";
export { getMemoryAllocations } from "../allocate/memory";
export { readStack } from "../read/stack";
export { slotAddress } from "../read/storage";
export { StoragePointer, isStoragePointer } from "../types/pointer";
export { StorageAllocations, StorageMemberAllocations, StorageMemberAllocation } from "../types/allocation";
export { Slot, isWordsLength } from "../types/storage";
export { DecoderRequest, isStorageRequest, isCodeRequest } from "../types/request";
export { EvmInfo } from "../types/evm";

export function* forEvmState(definition: AstDefinition, pointer: DataPointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  return yield* decode(definition, pointer, info);
}

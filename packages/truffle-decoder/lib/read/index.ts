import * as storage from "./storage";
import * as memory from "./memory";
import { DataPointer, isStackPointer, isStoragePointer, isMemoryPointer, isLiteralPointer } from "../types/pointer";
import { EvmState } from "../types/evm";

export default function read(pointer: DataPointer, state: EvmState): Uint8Array {
  if (isStackPointer(pointer) && state.stack && pointer.stack < state.stack.length) {
    return state.stack[pointer.stack];
  } else if (isStoragePointer(pointer) && state.storage) {
    return storage.readRange(state.storage, pointer.storage);
  } else if (isMemoryPointer(pointer) && state.memory) {
    return memory.readBytes(state.memory, pointer.memory.start, pointer.memory.length);
  } else if (isLiteralPointer(pointer)) {
    return pointer.literal;
  }
}
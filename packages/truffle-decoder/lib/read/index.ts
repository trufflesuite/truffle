import * as storage from "./storage";
import * as memory from "./memory";
import * as definition from "../define/definition";

export default function read(pointer: definition.DataPointer, state: any): Uint8Array {
  if (definition.isStackPointer(pointer) && state.stack && pointer.stack < state.stack.length) {
    return state.stack[pointer.stack];
  } else if (definition.isStoragePointer(pointer) && state.storage) {
    return storage.readRange(state.storage, pointer.storage);
  } else if (definition.isMemoryPointer(pointer) && state.memory) {
    return memory.readBytes(state.memory, pointer.memory.start, pointer.memory.length);
  } else if (definition.isLiteralPointer(pointer)) {
    return pointer.literal;
  }
}
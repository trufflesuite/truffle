import * as storage from "./storage";
import * as memory from "./memory";
import * as stack from "./stack";
import * as constant from "./constant";
import * as Pointer from "../types/pointer";
import { EvmState } from "../types/evm";
import { DecoderRequest } from "../types/request";

export default function* read(pointer: Pointer.DataPointer, state: EvmState): IterableIterator<Uint8Array | DecoderRequest> {
  if (Pointer.isStackPointer(pointer) && state.stack) {
    return stack.readStack(state.stack, pointer.stack.from, pointer.stack.to);
  } else if (Pointer.isStoragePointer(pointer) && state.storage) {
    return yield* storage.readRange(state.storage, pointer.storage);
  } else if (Pointer.isMemoryPointer(pointer) && state.memory) {
    return memory.readBytes(state.memory, pointer.memory.start, pointer.memory.length);
  } else if (Pointer.isCalldataPointer(pointer) && state.calldata) {
    return memory.readBytes(state.calldata, pointer.calldata.start, pointer.calldata.length);
    //there is no need for a separate calldata read function; the existing memory read function
    //will do fine
  } else if (Pointer.isStackLiteralPointer(pointer)) {
    return pointer.literal;
  } else if (Pointer.isConstantDefinitionPointer(pointer)) {
    return constant.readDefinition(pointer.definition);
  } else if (Pointer.isSpecialPointer(pointer)) {
    return state.specials[pointer.special];
  }
}

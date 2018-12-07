import * as storage from "./storage";
import * as memory from "./memory";
import { DataPointer, isStackPointer, isStoragePointer, isMemoryPointer, isLiteralPointer } from "../types/pointer";
import { EvmState } from "../types/evm";
import Web3 from "web3";

export default async function read(pointer: DataPointer, state: EvmState, web3?: Web3, contractAddress?: string): Promise<Uint8Array> {
  if (isStackPointer(pointer) && state.stack && pointer.stack < state.stack.length) {
    return state.stack[pointer.stack];
  } else if (isStoragePointer(pointer) && state.storage) {
    return await storage.readRange(state.storage, pointer.storage, web3, contractAddress);
  } else if (isMemoryPointer(pointer) && state.memory) {
    return memory.readBytes(state.memory, pointer.memory.start, pointer.memory.length);
  } else if (isLiteralPointer(pointer)) {
    return pointer.literal;
  }
}
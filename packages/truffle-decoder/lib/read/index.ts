import * as storage from "./storage";
import * as memory from "./memory";
import * as stack from "./stack";
import * as constant from "./constant";
import * as Pointer from "../types/pointer";
import { EvmState } from "../types/evm";
import Web3 from "web3";

export default async function read(pointer: Pointer.DataPointer, state: EvmState, web3?: Web3, contractAddress?: string): Promise<Uint8Array> {
  if (Pointer.isStackPointer(pointer) && state.stack) {
    return stack.readStack(state.stack, pointer.stack.from, pointer.stack.to);
  } else if (Pointer.isStoragePointer(pointer) && state.storage) {
    return await storage.readRange(state.storage, pointer.storage, web3, contractAddress);
  } else if (Pointer.isMemoryPointer(pointer) && state.memory) {
    return memory.readBytes(state.memory, pointer.memory.start, pointer.memory.length);
  } else if (Pointer.isCalldataPointer(pointer) && state.calldata) {
    return memory.readBytes(state.calldata, pointer.calldata.start, pointer.calldata.length);
    //there is no need for a separate calldata read function; the existing memory read function
    //will do fine
  } else if (Pointer.isStackLiteralPointer(pointer)) {
    return pointer.literal;
  } else if (Pointer.isConstantDefinitionPointer(pointer)) {
    return constant.readDefinition(pointer);
  }
}

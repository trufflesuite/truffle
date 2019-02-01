import debugModule from "debug";
const debug = debugModule("decoder:decode");

import * as DecodeUtils from "truffle-decode-utils";
import decodeValue from "./value";
import decodeMemory from "./memory";
import decodeStorage from "./storage";
import { decodeStack, decodeLiteral } from "./stack";
import { AstDefinition } from "truffle-decode-utils";
import { DataPointer, isStackLiteralPointer, isStoragePointer, isMemoryPointer, isStackPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import Web3 from "web3";

export default async function decode(definition: AstDefinition, pointer: DataPointer, info: EvmInfo, web3?: Web3, contractAddress?: string): Promise<any> {
  debug("Decoding %s", definition.name);

  if (isStackLiteralPointer(pointer)) {
    return await decodeLiteral(definition, pointer, info, web3, contractAddress);
    //note the literal value may be a storage pointer
  }

  if(isStoragePointer(pointer)) {
    return await decodeStorage(definition, pointer, info, web3, contractAddress)
  }

  if(isMemoryPointer(pointer)) {
    return await decodeMemory(definition, pointer, info);
    //memory does not need web3 & contractAddress
  }

  if(isStackPointer(pointer)) {
    return await decodeStack(definition, pointer, info, web3, contractAddress);
    //stack may contain pointer to storage so may need web3 & contractAddress
  }

  //the type system means we can't hit this point!
}

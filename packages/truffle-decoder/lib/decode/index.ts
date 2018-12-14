import debugModule from "debug";
const debug = debugModule("decoder:decode");

import * as DecodeUtils from "truffle-decode-utils";
import decodeValue from "./value";
import decodeMemoryReference from "./memory";
import decodeStorageReference from "./storage";
import { AstDefinition } from "truffle-decode-utils";
import { DataPointer, isLiteralPointer, isStoragePointer, isMemoryPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import Web3 from "web3";

export default async function decode(definition: AstDefinition, pointer: DataPointer, info: EvmInfo, web3?: Web3, contractAddress?: string): Promise<any> {
  debug("Decoding %s", definition.name);

  const identifier = DecodeUtils.Definition.typeIdentifier(definition);
  if (DecodeUtils.Definition.isReference(definition)) {
    switch (DecodeUtils.Definition.referenceType(definition)) {
      case "memory":
        // debug("decoding memory reference, type: %s", identifier);
        return await decodeMemoryReference(definition, pointer, info);
      case "storage":
        // debug("decoding storage reference, type: %s", identifier);
        return isStoragePointer(pointer) ? await decodeStorageReference(definition, pointer, info, web3, contractAddress) : undefined;
      default:
        // debug("Unknown reference category: %s", DecodeUtils.typeIdentifier(definition));
        return undefined;
    }
  }

  if (isLiteralPointer(pointer)) {
    return await decodeValue(definition, pointer, info, web3, contractAddress);
  }

  if (DecodeUtils.Definition.isMapping(definition) && isStoragePointer(pointer)) {
    // debug("decoding mapping, type: %s", identifier);
    return await decodeStorageReference(definition, pointer, info, web3, contractAddress);
  }

  // debug("decoding value, type: %s", identifier);
  return await decodeValue(definition, pointer, info, web3, contractAddress);
}

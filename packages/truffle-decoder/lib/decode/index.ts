
import * as utils from "../utils";
import decodeValue from "./value";
import decodeMemoryReference from "./memory";
import decodeStorageReference from "./storage";
import decodeMapping from "./mapping";
import { AstDefinition } from "../types/ast";
import { DataPointer, isLiteralPointer, isStoragePointer, isMemoryPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";

export default function decode(definition: AstDefinition, pointer: DataPointer, info: EvmInfo) {
  if (isLiteralPointer(pointer)) {
    return decodeValue(definition, pointer, info);
  }

  const identifier = utils.Definition.typeIdentifier(definition);
  if (utils.Definition.isReference(definition)) {
    switch (utils.Definition.referenceType(definition)) {
      case "memory":
        // debug("decoding memory reference, type: %s", identifier);
        return isMemoryPointer(pointer) ? decodeMemoryReference(definition, pointer, info) : undefined;
      case "storage":
        // debug("decoding storage reference, type: %s", identifier);
        return isStoragePointer(pointer) ? decodeStorageReference(definition, pointer, info) : undefined;
      default:
        // debug("Unknown reference category: %s", utils.typeIdentifier(definition));
        return undefined;
    }
  }

  if (utils.Definition.isMapping(definition) && isStoragePointer(pointer)) {
    // debug("decoding mapping, type: %s", identifier);
    return decodeMapping(definition, pointer, info);
  }

  // debug("decoding value, type: %s", identifier);
  return decodeValue(definition, pointer, info);
}

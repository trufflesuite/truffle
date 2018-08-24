
import * as utils from "../utils";
import decodeValue from "./value";
import decodeMemoryReference from "./memory";
import decodeStorageReference from "./storage";
import decodeMapping from "./mapping";
import { AstDefinition, DataPointer, isLiteralPointer } from "../define/definition";

export default function decode(definition: AstDefinition, pointer: DataPointer, info) {
  if (isLiteralPointer(pointer)) {
    return decodeValue(definition, pointer, info);
  }

  const identifier = utils.Definition.typeIdentifier(definition);
  if (utils.Definition.isReference(definition)) {
    switch (utils.Definition.referenceType(definition)) {
      case "memory":
        // debug("decoding memory reference, type: %s", identifier);
        return decodeMemoryReference(definition, pointer, info);
      case "storage":
        // debug("decoding storage reference, type: %s", identifier);
        return decodeStorageReference(definition, pointer, info);
      default:
        // debug("Unknown reference category: %s", utils.typeIdentifier(definition));
        return undefined;
    }
  }

  if (utils.Definition.isMapping(definition)) {
    // debug("decoding mapping, type: %s", identifier);
    return decodeMapping(definition, pointer, info);
  }

  // debug("decoding value, type: %s", identifier);
  return decodeValue(definition, pointer, info);
}

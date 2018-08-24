import decode from "./index";
import { AstDefinition } from "../define/definition";

export default function decodeMapping(definition: AstDefinition, pointer, info) {
  if (definition.referencedDeclaration) {
    // attempting to decode reference to mapping, thus missing valid pointer
    return undefined;
  }

  const { mappingKeys } = info;

  // debug("mapping %O", pointer);
  // debug("mapping definition %O", definition);
  let keys = mappingKeys[definition.id] || [];
  // debug("known keys %o", keys);

  let keyDefinition = definition.typeName.keyType;
  let valueDefinition = definition.typeName.valueType;

  let baseSlot = pointer.storage.from.slot;
  if (!Array.isArray(baseSlot)) {
    baseSlot = [baseSlot];
  }

  let mapping = {};
  // debug("mapping %O", mapping);
  for (let key of keys) {
    let keyPointer = { "literal": key };
    let valuePointer = {
      storage: {
        from: {
          slot: [key, ...baseSlot],
          index: 0
        },
        to: {
          slot: [key, ...baseSlot],
          index: 31
        }
      }
    };
    // debug("keyPointer %o", keyPointer);

    // NOTE mapping keys are potentially lossy because JS only likes strings
    let keyValue = decode(keyDefinition, keyPointer, info);
    // debug("keyValue %o", keyValue);
    if (keyValue != undefined) {
      mapping[keyValue.toString()] =
        decode(valueDefinition, valuePointer, info);
    }
  }

  return mapping;
}

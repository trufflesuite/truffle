import decode from "./index";
import { AstDefinition } from "../types/ast";
import { StoragePointer, LiteralPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { Allocation } from "truffle-decode-utils";
import Web3 from "web3";

export default function decodeMapping(definition: AstDefinition, pointer: StoragePointer, info: EvmInfo, web3?: Web3, contractAddress?: string) {
  if (definition.referencedDeclaration) {
    // attempting to decode reference to mapping, thus missing valid pointer
    return undefined;
  }

  const { mappingKeys } = info;

  // debug("mapping %O", pointer);
  // debug("mapping definition %O", definition);
  let keys: Uint8Array[] = mappingKeys[definition.id] || [];
  // debug("known keys %o", keys);

  let keyDefinition = definition.typeName.keyType;
  let valueDefinition = definition.typeName.valueType;

  let baseSlot: Allocation.Slot = pointer.storage.from.slot;

  let mapping: any = {};
  // debug("mapping %O", mapping);
  for (let key of keys) {
    let keyPointer: LiteralPointer = {
      literal: key
    };
    let valuePointer: StoragePointer = {
      storage: {
        from: {
          slot: <Allocation.Slot>{
            key: key,
            path: baseSlot.path || undefined,
            offset: baseSlot.offset
          },
          index: 0
        },
        to: {
          slot: <Allocation.Slot>{
            key: key,
            path: baseSlot.path || undefined,
            offset: baseSlot.offset
          },
          index: 31
        }
      }
    };
    // debug("keyPointer %o", keyPointer);

    // NOTE mapping keys are potentially lossy because JS only likes strings
    let keyValue = decode(keyDefinition, keyPointer, info, web3, contractAddress);
    // debug("keyValue %o", keyValue);
    if (keyValue != undefined) {
      mapping[keyValue.toString()] =
        decode(valueDefinition, valuePointer, info, web3, contractAddress);
    }
  }

  return mapping;
}

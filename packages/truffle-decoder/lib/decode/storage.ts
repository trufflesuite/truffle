import debugModule from "debug";
const debug = debugModule("decoder:decode:storage");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import decodeValue from "./value";
import { StoragePointer, DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { storageSize } from "../allocate/storage";
import { slotAddress } from "../read/storage";
import * as Types from "../types/storage";
import BN from "bn.js";
import { EvmStruct, EvmMapping } from "../interface/contract-decoder";
import { DecoderRequest } from "../types/request";

export default function* decodeStorage(definition: DecodeUtils.AstDefinition, pointer: StoragePointer, info: EvmInfo): IterableIterator<any | DecoderRequest> {
  if(DecodeUtils.Definition.isReference(definition) || DecodeUtils.Definition.isMapping(definition)) {
    //note that mappings are not caught by isReference and must be checked for separately
    return yield* decodeStorageReference(definition, pointer, info);
  }
  else {
    return yield* decodeValue(definition, pointer, info);
  }
}

//decodes storage at the address *read* from the pointer -- hence why this takes DataPointer rather than StoragePointer.
//NOTE: ONLY for use with pointers to reference types!
//Of course, pointers to value types don't exist in Solidity, so that warning is redundant, but...
export function* decodeStorageReferenceByAddress(definition: DecodeUtils.AstDefinition, pointer: DataPointer, info: EvmInfo): IterableIterator<any | DecoderRequest> {

  const rawValue: Uint8Array = yield* read(pointer, info.state);
  const startOffset = DecodeUtils.Conversion.toBN(rawValue);
  //we *know* the type being decoded must be sized in words, because it's a
  //reference type, but TypeScript doesn't, so we'll have to use a type
  //coercion
  const size = (<{words: number}>storageSize(definition, info.referenceDeclarations, info.storageAllocations)).words;
  //now, construct the storage pointer
  const newPointer = { storage: {
    from: {
      slot: {
        offset: startOffset
      },
      index: 0
    },
    to: {
      slot: {
        offset: startOffset.addn(size - 1)
      },
      index: DecodeUtils.EVM.WORD_SIZE - 1
    }
  }};
  //dispatch to decodeStorageReference
  return yield* decodeStorageReference(definition, newPointer, info);
}

export function* decodeStorageReference(definition: DecodeUtils.AstDefinition, pointer: StoragePointer, info: EvmInfo): IterableIterator<any | DecoderRequest> {
  var data;
  var length;

  const { state } = info;

  switch (DecodeUtils.Definition.typeClass(definition)) {
    case "array": {
      debug("storage array! %o", pointer);
      if (DecodeUtils.Definition.isDynamicArray(definition)) {
        debug("dynamic array");
        debug("definition %O", definition);
        data = yield* read(pointer, state);

        length = DecodeUtils.Conversion.toBN(data).toNumber();
      }
      else {
        debug("static array");
        length = DecodeUtils.Definition.staticLength(definition);
      }
      debug("length %o", length);

      const baseDefinition = definition.baseType || definition.typeName.baseType;
        //I'm deliberately not using the DecodeUtils function for this, because
        //we should *not* need a faked-up type here!
      const referenceId = baseDefinition.referencedDeclaration ||
        (baseDefinition.typeName ? baseDefinition.typeName.referencedDeclaration : undefined);

      debug("about to determine baseSize");
      let baseSize: Types.StorageLength = storageSize(baseDefinition, info.referenceDeclarations, info.storageAllocations);
      debug("baseSize %o", baseSize);
      
      //we are going to make a list of child ranges, pushing them one by one onto
      //this list, and then decode them; the first part will vary based on whether
      //we're in the words case or the bytes case, the second will not
      let ranges: Types.Range[] = [];

      if(Types.isWordsLength(baseSize)) {
        //currentSlot will point to the start of the entry being decoded
        let currentSlot: Types.Slot = {
          path: pointer.storage.from.slot,
          offset: new BN(0),
          hashPath: DecodeUtils.Definition.isDynamicArray(definition)
        };

        for (let i = 0; i < length; i++) {
          let childRange: Types.Range = {
            from: {
              slot: {
                path: currentSlot.path,
                offset: currentSlot.offset.clone(),
                hashPath: currentSlot.hashPath
              },
              index: 0
            },
            to: {
              slot: {
                path: currentSlot.path,
                offset: currentSlot.offset.addn(baseSize.words - 1),
                hashPath: currentSlot.hashPath
              },
              index: DecodeUtils.EVM.WORD_SIZE - 1
            },
          };

          ranges.push(childRange);

          currentSlot.offset.iaddn(baseSize.words);
        }
      }
      else {

        const perWord = Math.floor(DecodeUtils.EVM.WORD_SIZE / baseSize.bytes);
        debug("perWord %d", perWord);

        //currentPosition will point to the start of the entry being decoded
        //note we have baseSize.bytes <= DecodeUtils.EVM.WORD_SIZE
        let currentPosition: Types.StoragePosition = {
          slot: {
            path: pointer.storage.from.slot,
            offset: new BN(0),
            hashPath: DecodeUtils.Definition.isDynamicArray(definition)
          },
          index: DecodeUtils.EVM.WORD_SIZE - baseSize.bytes //note the starting index!
        };

        for (let i = 0; i < length; i++) {
          let childRange: Types.Range = {
            from: {
              slot: {
                path: currentPosition.slot.path,
                offset: currentPosition.slot.offset.clone(),
                hashPath: currentPosition.slot.hashPath
              },
              index: currentPosition.index
            },
            length: baseSize.bytes
          };

          ranges.push(childRange);

          currentPosition.index -= baseSize.bytes;
          if (currentPosition.index < 0) {
            currentPosition.slot.offset.iaddn(1);
            currentPosition.index = DecodeUtils.EVM.WORD_SIZE - baseSize.bytes;
          }
        }
      }

      let decodedChildren: any[] = [];

      for(let childRange of ranges) {
        decodedChildren.push(
          yield* decodeStorage(baseDefinition, {storage: childRange}, info)
        );
      }

      return decodedChildren;
    }

    case "bytes":
    case "string": {
      data = yield* read(pointer, state);
      if (data == undefined) {
        return undefined;
      }

      debug("data %O", data);
      let lengthByte = data[DecodeUtils.EVM.WORD_SIZE - 1];
      if (!lengthByte) {
        lengthByte = 0;
      }

      if (lengthByte % 2 == 0) {
        // string lives in word, length is last byte / 2
        length = lengthByte / 2;
        debug("in-word; length %o", length);

        return yield* decodeValue(definition, { storage: {
          from: { slot: pointer.storage.from.slot, index: 0 },
          to: { slot: pointer.storage.from.slot, index: length - 1}
        }}, info);

      } else {
        length = DecodeUtils.Conversion.toBN(data).subn(1).divn(2).toNumber();
        debug("new-word, length %o", length);

        return yield* decodeValue(definition, {
          storage: {
            from: {
              slot: {
                path: pointer.storage.from.slot,
                offset: new BN(0),
                hashPath: true
              },
              index: 0
            },
            length
          }
        }, info);
      }
    }

    case "struct": {

      const referencedDeclaration = (definition.typeName)
        ? definition.typeName.referencedDeclaration
        : definition.referencedDeclaration;

      // seese's way -- now the only way!

      const type = info.referenceDeclarations[referencedDeclaration].name;

      let result: EvmStruct = {
        name: definition.name,
        type,
        members: {}
      };

      const structAllocation = info.storageAllocations[referencedDeclaration];
      const members = Object.values(structAllocation.members);

      for (let memberAllocation of members) {
        let memberDefinition = memberAllocation.definition;
        const memberPointer = <StoragePointer>memberAllocation.pointer;
          //the type system thinks memberPointer might also be a constant
          //definition pointer.  However, structs can't contain constants,
          //so *we* know it's not, and can safely coerce it.
        debug("pointer %O", pointer);
        const childRange : Types.Range = {
          from: {
            slot: {
              path: pointer.storage.from.slot,
              offset: memberPointer.storage.from.slot.offset.clone()
              //note that memberPointer should have no path
            },
            index: memberPointer.storage.from.index
          },
          to: {
            slot: {
              path: pointer.storage.from.slot,
              offset: memberPointer.storage.to.slot.offset.clone()
              //note that memberPointer should have no path
            },
            index: memberPointer.storage.to.index
          },
        };
        const val = yield* decodeStorage(
          memberDefinition,
          {storage: childRange}, info
        );

        result.members[memberDefinition.name] = {
          name: memberDefinition.name,
          type: DecodeUtils.Definition.typeClass(memberDefinition),
          value: val
        };
      }

      return result;
    }

    case "mapping": {

      debug("decoding mapping");
      debug("name %s", definition.name);

      const keyDefinition = definition.keyType || definition.typeName.keyType;
      const valueDefinition = definition.valueType || definition.typeName.valueType;
      const valueSize = storageSize(valueDefinition, info.referenceDeclarations, info.storageAllocations)

      const result: EvmMapping = {
        name: definition.name,
        type: "mapping",
        id: definition.id,
        keyType: DecodeUtils.Definition.typeClass(keyDefinition),
        valueType: DecodeUtils.Definition.typeClass(valueDefinition),
        members: {}
      };

      const baseSlot: Types.Slot = pointer.storage.from.slot;
      debug("baseSlot %o", baseSlot);
      debug("base slot address %o", slotAddress(baseSlot));

      const keySlots = info.mappingKeys.filter( ({path}) =>
        slotAddress(baseSlot).eq(slotAddress(path)));

      for (const {key, keyEncoding} of keySlots) {

        let valuePointer: StoragePointer;

        if(Types.isWordsLength(valueSize)) {
          valuePointer = {
            storage: {
              from: {
                slot: {
                  key,
                  keyEncoding,
                  path: baseSlot,
                  offset: new BN(0)
                },
                index: 0
              },
              to: {
                slot: {
                  key,
                  keyEncoding,
                  path: baseSlot,
                  offset: new BN(valueSize.words - 1)
                },
                index: DecodeUtils.EVM.WORD_SIZE - 1
              }
            }
          };
        }
        else {
          valuePointer = {
            storage: {
              from: {
                slot: {
                  key,
                  keyEncoding,
                  path: baseSlot,
                  offset: new BN(0)
                },
                index: DecodeUtils.EVM.WORD_SIZE - valueSize.bytes
              },
              to: {
                slot: {
                  key,
                  keyEncoding,
                  path: baseSlot,
                  offset: new BN(0)
                },
                index: DecodeUtils.EVM.WORD_SIZE - 1
              }
            }
          };
        }

        //note at this point, key could be a string, hex string,
        //BN, or boolean
        result.members[key.toString()] =
          yield* decodeStorage(valueDefinition, valuePointer, info);
      }

      return result;
    }

    default: {
      debug("Unknown storage reference type: %s", DecodeUtils.Definition.typeIdentifier(definition));
      return undefined;
    }
  }
}

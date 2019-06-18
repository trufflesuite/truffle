import debugModule from "debug";
const debug = debugModule("decoder-core:decode:storage");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import { Types, Values } from "truffle-decode-utils";
import decodeValue from "./value";
import { StoragePointer, DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { storageSizeForType } from "../allocate/storage";
import { slotAddress } from "../read/storage";
import * as StorageTypes from "../types/storage";
import BN from "bn.js";
import { DecoderRequest, GeneratorJunk } from "../types/request";

export default function* decodeStorage(dataType: Types.Type, pointer: StoragePointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  if(Types.isReferenceType(dataType)) {
    return yield* decodeStorageReference(dataType, pointer, info);
  }
  else {
    return yield* decodeValue(dataType, pointer, info);
  }
}

//decodes storage at the address *read* from the pointer -- hence why this takes DataPointer rather than StoragePointer.
//NOTE: ONLY for use with pointers to reference types!
//Of course, pointers to value types don't exist in Solidity, so that warning is redundant, but...
export function* decodeStorageReferenceByAddress(dataType: Types.ReferenceType, pointer: DataPointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {

  const allocations = info.allocations.storage;

  let rawValue: Uint8Array;
  try {
    rawValue = yield* read(pointer, info.state);
  }
  catch(error) { //error: Values.DecodingError
    return Values.makeGenericErrorResult(dataType, error.error);
  }
  const startOffset = DecodeUtils.Conversion.toBN(rawValue);
  let rawSize: StorageTypes.StorageLength;
  try {
    rawSize = storageSizeForType(dataType, info.userDefinedTypes, allocations);
  }
  catch(error) { //error: Values.DecodingError
    return Values.makeGenericErrorResult(dataType, error.error);
  }
  //we *know* the type being decoded must be sized in words, because it's a
  //reference type, but TypeScript doesn't, so we'll have to use a type
  //coercion
  const size = (<{words: number}>rawSize).words;
  //now, construct the storage pointer
  const newPointer = { location: "storage", range: {
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
  return yield* decodeStorageReference(dataType, newPointer, info);
}

export function* decodeStorageReference(dataType: Types.ReferenceType, pointer: StoragePointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  var data;
  var length;

  const { state } = info;

  switch (dataType.typeClass) {
    case "array": {
      debug("storage array! %o", pointer);
      switch(dataType.kind) {
        case "dynamic":
          debug("dynamic array");
          debug("type %O", dataType);
          try {
            data = yield* read(pointer, state);
          }
          catch(error) { //error: Values.DecodingError
            return Values.makeGenericErrorResult(dataType, error.error);
          }
          length = DecodeUtils.Conversion.toBN(data).toNumber();
          break;
        case "static":
          debug("static array");
          length = dataType.length.toNumber();
          break;
      }
      debug("length %o", length);

      debug("about to determine baseSize");
      let baseSize: StorageTypes.StorageLength;
      try {
        baseSize = storageSizeForType(dataType.baseType, info.userDefinedTypes, allocations);
      }
      catch(error) { //error: Values.DecodingError
        return Values.makeGenericErrorResult(dataType, error.error);
      }
      debug("baseSize %o", baseSize);
      
      //we are going to make a list of child ranges, pushing them one by one onto
      //this list, and then decode them; the first part will vary based on whether
      //we're in the words case or the bytes case, the second will not
      let ranges: StorageTypes.Range[] = [];

      if(StorageTypes.isWordsLength(baseSize)) {
        //currentSlot will point to the start of the entry being decoded
        let currentSlot: StorageTypes.Slot = {
          path: pointer.range.from.slot,
          offset: new BN(0),
          hashPath: dataType.kind === "dynamic"
        };

        for (let i = 0; i < length; i++) {
          let childRange: StorageTypes.Range = {
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
        let currentPosition: StorageTypes.StoragePosition = {
          slot: {
            path: pointer.range.from.slot,
            offset: new BN(0),
            hashPath: dataType.kind === "dynamic"
          },
          index: DecodeUtils.EVM.WORD_SIZE - baseSize.bytes //note the starting index!
        };

        for (let i = 0; i < length; i++) {
          let childRange: StorageTypes.Range = {
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

      let decodedChildren: Values.Result[] = [];

      for(let childRange of ranges) {
        decodedChildren.push(
          <Values.Result> (yield* decodeStorage(dataType.baseType, {location: "storage", range: childRange}, info))
        );
      }

      return new Values.ArrayValue(dataType, decodedChildren);
    }

    case "bytes":
    case "string": {
      try {
        data = yield* read(pointer, state);
      }
      catch(error) { //error: Values.DecodingError
        return Values.makeGenericErrorResult(dataType, error.error);
      }

      debug("data %O", data);
      let lengthByte = data[DecodeUtils.EVM.WORD_SIZE - 1];

      if (lengthByte % 2 == 0) {
        // string lives in word, length is last byte / 2
        length = lengthByte / 2;
        debug("in-word; length %o", length);

        return yield* decodeValue(dataType, { location: "storage", range: {
          from: { slot: pointer.range.from.slot, index: 0 },
          to: { slot: pointer.range.from.slot, index: length - 1}
        }}, info);

      } else {
        length = DecodeUtils.Conversion.toBN(data).subn(1).divn(2).toNumber();
        debug("new-word, length %o", length);

        return yield* decodeValue(dataType, { location: "storage",
          range: {
            from: {
              slot: {
                path: pointer.range.from.slot,
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

      const typeId = dataType.id;
      const structAllocation = allocations[typeId];
      if(!structAllocation) {
        return new Values.StructErrorResult(
          dataType,
          new Values.UserDefinedTypeNotFoundError(dataType)
        );
      }

      let decodedMembers: [string, Values.Result][] = [];
      const members = structAllocation.members;

      for(let index = 0; index < members.length; index++) {
        const memberAllocation = members[index];
        const memberPointer = <StoragePointer>memberAllocation.pointer;
          //the type system thinks memberPointer might also be a constant
          //definition pointer.  However, structs can't contain constants,
          //so *we* know it's not, and can safely coerce it.
        debug("pointer %O", pointer);
        const childRange: StorageTypes.Range = {
          from: {
            slot: {
              path: pointer.range.from.slot,
              offset: memberPointer.range.from.slot.offset.clone()
              //note that memberPointer should have no path
            },
            index: memberPointer.range.from.index
          },
          to: {
            slot: {
              path: pointer.range.from.slot,
              offset: memberPointer.range.to.slot.offset.clone()
              //note that memberPointer should have no path
            },
            index: memberPointer.range.to.index
          },
        };

        let memberName = memberAllocation.definition.name;
        let storedType = <Types.StructType>info.userDefinedTypes[typeId];
        if(!storedType) {
          return new Values.StructErrorResult(
            dataType,
            new Values.UserDefinedTypeNotFoundError(dataType)
          );
        }
        let storedMemberType = storedType.memberTypes[index][1];
        let memberType = Types.specifyLocation(storedMemberType, "storage");

        decodedMembers.push([
          memberName,
          <Values.Result> (yield* decodeStorage(
            memberType,
            {location: "storage", range: childRange},
            info
          ))
        ]);
      }

      return new Values.StructValue(dataType, decodedMembers);
    }

    case "mapping": {

      debug("decoding mapping");

      const valueType = dataType.valueType;
      let valueSize: StorageTypes.StorageLength;
      try {
        valueSize = storageSizeForType(valueType, info.userDefinedTypes, allocations);
      }
      catch(error) { //error: Values.DecodingError
        return Values.makeGenericErrorResult(dataType, error.error);
      }

      let decodedEntries: [Values.ElementaryResult, Values.Result][] = [];

      const baseSlot: StorageTypes.Slot = pointer.range.from.slot;
      debug("baseSlot %o", baseSlot);
      debug("base slot address %o", slotAddress(baseSlot));

      const keySlots = info.mappingKeys.filter( ({path}) =>
        slotAddress(baseSlot).eq(slotAddress(path)));

      for (const {key} of keySlots) {

        let valuePointer: StoragePointer;

        if(StorageTypes.isWordsLength(valueSize)) {
          valuePointer = {
            location: "storage",
            range: {
              from: {
                slot: {
                  key,
                  path: baseSlot,
                  offset: new BN(0)
                },
                index: 0
              },
              to: {
                slot: {
                  key,
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
            range: {
              from: {
                slot: {
                  key,
                  path: baseSlot,
                  offset: new BN(0)
                },
                index: DecodeUtils.EVM.WORD_SIZE - valueSize.bytes
              },
              to: {
                slot: {
                  key,
                  path: baseSlot,
                  offset: new BN(0)
                },
                index: DecodeUtils.EVM.WORD_SIZE - 1
              }
            }
          };
        }

        decodedEntries.push(
          [key, <Values.Result> (yield* decodeStorage(valueType, valuePointer, info))]
        );
      }

      return new Values.MappingValue(dataType, decodedEntries);
    }
  }
}

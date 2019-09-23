import debugModule from "debug";
const debug = debugModule("codec:decode:storage");

import read from "../read";
import * as CodecUtils from "../utils";
import { TypeUtils } from "../utils";
import { Types, Values, Errors } from "../format";
import decodeValue from "./value";
import { StoragePointer, DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { storageSizeForType } from "../allocate/storage";
import { slotAddress } from "../read/storage";
import * as StorageTypes from "../types/storage";
import { isWordsLength } from "../utils/storage";
import BN from "bn.js";
import { DecoderRequest } from "../types/request";

export default function* decodeStorage(dataType: Types.Type, pointer: StoragePointer, info: EvmInfo): Generator<DecoderRequest, Values.Result, Uint8Array> {
  if(TypeUtils.isReferenceType(dataType)) {
    return yield* decodeStorageReference(dataType, pointer, info);
  }
  else {
    return yield* decodeValue(dataType, pointer, info);
  }
}

//decodes storage at the address *read* from the pointer -- hence why this takes DataPointer rather than StoragePointer.
//NOTE: ONLY for use with pointers to reference types!
//Of course, pointers to value types don't exist in Solidity, so that warning is redundant, but...
export function* decodeStorageReferenceByAddress(dataType: Types.ReferenceType, pointer: DataPointer, info: EvmInfo): Generator<DecoderRequest, Values.Result, Uint8Array> {

  const allocations = info.allocations.storage;

  let rawValue: Uint8Array;
  try {
    rawValue = yield* read(pointer, info.state);
  }
  catch(error) {
    return <Errors.ErrorResult> { //no idea why TS is failing here
      type: dataType,
      kind: "error" as const,
      error: (<Errors.DecodingError>error).error
    };
  }
  const startOffset = CodecUtils.Conversion.toBN(rawValue);
  let rawSize: StorageTypes.StorageLength;
  try {
    rawSize = storageSizeForType(dataType, info.userDefinedTypes, allocations);
  }
  catch(error) { //error: Errors.DecodingError
    return <Errors.ErrorResult> { //no idea why TS is failing here
      type: dataType,
      kind: "error" as const,
      error: (<Errors.DecodingError>error).error
    };
  }
  //we *know* the type being decoded must be sized in words, because it's a
  //reference type, but TypeScript doesn't, so we'll have to use a type
  //coercion
  const size = (<{words: number}>rawSize).words;
  //now, construct the storage pointer
  const newPointer = { location: "storage" as "storage", range: {
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
      index: CodecUtils.EVM.WORD_SIZE - 1
    }
  }};
  //dispatch to decodeStorageReference
  return yield* decodeStorageReference(dataType, newPointer, info);
}

export function* decodeStorageReference(dataType: Types.ReferenceType, pointer: StoragePointer, info: EvmInfo): Generator<DecoderRequest, Values.Result, Uint8Array> {
  var data;
  var length;

  const { state } = info;
  const allocations = info.allocations.storage;

  switch (dataType.typeClass) {
    case "array": {
      debug("storage array! %o", pointer);
      switch(dataType.kind) {
        case "dynamic":
          debug("dynamic array");
          debug("type %O", dataType);
          data = yield* read(pointer, state);
          length = CodecUtils.Conversion.toBN(data).toNumber();
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
      catch(error) { //error: Errors.DecodingError
        return {
          type: dataType,
          kind: "error" as const,
          error: (<Errors.DecodingError>error).error
        };
      }
      debug("baseSize %o", baseSize);
      
      //we are going to make a list of child ranges, pushing them one by one onto
      //this list, and then decode them; the first part will vary based on whether
      //we're in the words case or the bytes case, the second will not
      let ranges: StorageTypes.Range[] = [];

      if(isWordsLength(baseSize)) {
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
              index: CodecUtils.EVM.WORD_SIZE - 1
            },
          };

          ranges.push(childRange);

          currentSlot.offset.iaddn(baseSize.words);
        }
      }
      else {

        const perWord = Math.floor(CodecUtils.EVM.WORD_SIZE / baseSize.bytes);
        debug("perWord %d", perWord);

        //currentPosition will point to the start of the entry being decoded
        //note we have baseSize.bytes <= CodecUtils.EVM.WORD_SIZE
        let currentPosition: StorageTypes.StoragePosition = {
          slot: {
            path: pointer.range.from.slot,
            offset: new BN(0),
            hashPath: dataType.kind === "dynamic"
          },
          index: CodecUtils.EVM.WORD_SIZE - baseSize.bytes //note the starting index!
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
            currentPosition.index = CodecUtils.EVM.WORD_SIZE - baseSize.bytes;
          }
        }
      }

      let decodedChildren: Values.Result[] = [];

      for(let childRange of ranges) {
        decodedChildren.push(
          yield* decodeStorage(dataType.baseType, {location: "storage" as const, range: childRange}, info)
        );
      }

      return {
        type: dataType,
        kind: "value" as const,
        value: decodedChildren
      };
    }

    case "bytes":
    case "string": {
      data = yield* read(pointer, state);

      debug("data %O", data);
      let lengthByte = data[CodecUtils.EVM.WORD_SIZE - 1];

      if (lengthByte % 2 == 0) {
        // string lives in word, length is last byte / 2
        length = lengthByte / 2;
        debug("in-word; length %o", length);

        return yield* decodeValue(dataType, { location: "storage", range: {
          from: { slot: pointer.range.from.slot, index: 0 },
          to: { slot: pointer.range.from.slot, index: length - 1}
        }}, info);

      } else {
        length = CodecUtils.Conversion.toBN(data).subn(1).divn(2).toNumber();
        debug("new-word, length %o", length);

        return yield* decodeValue(dataType, { location: "storage" as const,
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
      const structAllocation = allocations[parseInt(typeId)];
      if(!structAllocation) {
        return {
          type: dataType,
          kind: "error" as const,
          error: {
            kind: "UserDefinedTypeNotFoundError" as const,
            type: dataType
          }
        };
      }

      let decodedMembers: Values.NameValuePair[] = [];
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
          return {
            type: dataType,
            kind: "error" as const,
            error: {
              kind: "UserDefinedTypeNotFoundError" as const,
              type: dataType
            }
          };
        }
        let storedMemberType = storedType.memberTypes[index].type;
        let memberType = TypeUtils.specifyLocation(storedMemberType, "storage" as const);

        decodedMembers.push({
          name: memberName,
          value: yield* decodeStorage(
            memberType,
            {location: "storage" as const, range: childRange},
            info
          )
        });
      }

      return {
        type: dataType,
        kind: "value" as const,
        value: decodedMembers
      };
    }

    case "mapping": {

      debug("decoding mapping");

      const valueType = dataType.valueType;
      let valueSize: StorageTypes.StorageLength;
      try {
        valueSize = storageSizeForType(valueType, info.userDefinedTypes, allocations);
      }
      catch(error) { //error: Errors.DecodingError
        return {
          type: dataType,
          kind: "error" as const,
          error: (<Errors.DecodingError>error).error
        };
      }

      let decodedEntries: Values.KeyValuePair[] = [];

      const baseSlot: StorageTypes.Slot = pointer.range.from.slot;
      debug("baseSlot %o", baseSlot);
      debug("base slot address %o", slotAddress(baseSlot));

      const keySlots = info.mappingKeys.filter( ({path}) =>
        slotAddress(baseSlot).eq(slotAddress(path)));

      for (const {key} of keySlots) {

        let valuePointer: StoragePointer;

        if(isWordsLength(valueSize)) {
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
                index: CodecUtils.EVM.WORD_SIZE - 1
              }
            }
          };
        }
        else {
          valuePointer = {
            location: "storage",
            range: {
              from: {
                slot: {
                  key,
                  path: baseSlot,
                  offset: new BN(0)
                },
                index: CodecUtils.EVM.WORD_SIZE - valueSize.bytes
              },
              to: {
                slot: {
                  key,
                  path: baseSlot,
                  offset: new BN(0)
                },
                index: CodecUtils.EVM.WORD_SIZE - 1
              }
            }
          };
        }

        decodedEntries.push({
          key,
          value: yield* decodeStorage(valueType, valuePointer, info)
        });
      }

      return {
        type: dataType,
        kind: "value" as const,
        value: decodedEntries
      };
    }
  }
}

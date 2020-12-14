import debugModule from "debug";
const debug = debugModule("codec:storage:decode");

import read from "@truffle/codec/read";
import * as Conversion from "@truffle/codec/conversion";
import * as Format from "@truffle/codec/format";
import * as Basic from "@truffle/codec/basic";
import * as Bytes from "@truffle/codec/bytes";
import * as Storage from "@truffle/codec/storage/types";
import * as Utils from "@truffle/codec/storage/utils";
import * as Pointer from "@truffle/codec/pointer";
import { DecoderRequest } from "@truffle/codec/types";
import * as Evm from "@truffle/codec/evm";
import { storageSize } from "@truffle/codec/storage/allocate";
import BN from "bn.js";
import { DecodingError } from "@truffle/codec/errors";

export function* decodeStorage(
  dataType: Format.Types.Type,
  pointer: Pointer.StoragePointer,
  info: Evm.EvmInfo
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  if (Format.Types.isReferenceType(dataType)) {
    return yield* decodeStorageReference(dataType, pointer, info);
  } else {
    return yield* Basic.Decode.decodeBasic(dataType, pointer, info);
  }
}

//decodes storage at the address *read* from the pointer -- hence why this takes DataPointer rather than StoragePointer.
//NOTE: ONLY for use with pointers to reference types!
//Of course, pointers to value types don't exist in Solidity, so that warning is redundant, but...
export function* decodeStorageReferenceByAddress(
  dataType: Format.Types.ReferenceType,
  pointer: Pointer.DataPointer,
  info: Evm.EvmInfo
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  const allocations = info.allocations.storage;

  let rawValue: Uint8Array;
  try {
    rawValue = yield* read(pointer, info.state);
  } catch (error) {
    if (error instanceof DecodingError) {
      return <Format.Errors.ErrorResult>{
        //no idea why TS is failing here
        type: dataType,
        kind: "error" as const,
        error: error.error
      };
    } else {
      throw error;
    }
  }
  const startOffset = Conversion.toBN(rawValue);
  let rawSize: Storage.StorageLength;
  try {
    rawSize = storageSize(dataType, info.userDefinedTypes, allocations);
  } catch (error) {
    //error: DecodingError
    if (error instanceof DecodingError) {
      return <Format.Errors.ErrorResult>{
        //no idea why TS is failing here
        type: dataType,
        kind: "error" as const,
        error: error.error
      };
    } else {
      throw error;
    }
  }
  //we *know* the type being decoded must be sized in words, because it's a
  //reference type, but TypeScript doesn't, so we'll have to use a type
  //coercion
  const size = (<{ words: number }>rawSize).words;
  //now, construct the storage pointer
  const newPointer = {
    location: "storage" as "storage",
    range: {
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
        index: Evm.Utils.WORD_SIZE - 1
      }
    }
  };
  //dispatch to decodeStorageReference
  return yield* decodeStorageReference(dataType, newPointer, info);
}

export function* decodeStorageReference(
  dataType: Format.Types.ReferenceType,
  pointer: Pointer.StoragePointer,
  info: Evm.EvmInfo
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  var data;
  var length;

  const { state } = info;
  const allocations = info.allocations.storage;

  switch (dataType.typeClass) {
    case "array": {
      debug("storage array! %o", pointer);
      let lengthAsBN: BN;
      switch (dataType.kind) {
        case "dynamic":
          debug("dynamic array");
          debug("type %O", dataType);
          try {
            data = yield* read(pointer, state);
          } catch (error) {
            if (error instanceof DecodingError) {
              return <Format.Errors.ErrorResult>{
                //no idea why TS is failing here
                type: dataType,
                kind: "error" as const,
                error: error.error
              };
            } else {
              throw error;
            }
          }
          lengthAsBN = Conversion.toBN(data);
          break;
        case "static":
          debug("static array");
          lengthAsBN = dataType.length;
          break;
      }
      try {
        length = lengthAsBN.toNumber();
      } catch (_) {
        return {
          type: dataType,
          kind: "error" as const,
          error: {
            kind: "OverlongArraysAndStringsNotImplementedError" as const,
            lengthAsBN
          }
        };
      }
      debug("length %o", length);

      debug("about to determine baseSize");
      let baseSize: Storage.StorageLength;
      try {
        baseSize = storageSize(
          dataType.baseType,
          info.userDefinedTypes,
          allocations
        );
      } catch (error) {
        //error: DecodingError
        if (error instanceof DecodingError) {
          return {
            type: dataType,
            kind: "error" as const,
            error: error.error
          };
        } else {
          throw error;
        }
      }
      debug("baseSize %o", baseSize);

      //we are going to make a list of child ranges, pushing them one by one onto
      //this list, and then decode them; the first part will vary based on whether
      //we're in the words case or the bytes case, the second will not
      let ranges: Storage.Range[] = [];

      if (Utils.isWordsLength(baseSize)) {
        //currentSlot will point to the start of the entry being decoded
        let currentSlot: Storage.Slot = {
          path: pointer.range.from.slot,
          offset: new BN(0),
          hashPath: dataType.kind === "dynamic"
        };

        for (let i = 0; i < length; i++) {
          let childRange: Storage.Range = {
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
              index: Evm.Utils.WORD_SIZE - 1
            }
          };

          ranges.push(childRange);

          currentSlot.offset.iaddn(baseSize.words);
        }
      } else {
        const perWord = Math.floor(Evm.Utils.WORD_SIZE / baseSize.bytes);
        debug("perWord %d", perWord);

        //currentPosition will point to the start of the entry being decoded
        //note we have baseSize.bytes <= Evm.Utils.WORD_SIZE
        let currentPosition: Storage.StoragePosition = {
          slot: {
            path: pointer.range.from.slot,
            offset: new BN(0),
            hashPath: dataType.kind === "dynamic"
          },
          index: Evm.Utils.WORD_SIZE - baseSize.bytes //note the starting index!
        };

        for (let i = 0; i < length; i++) {
          let childRange: Storage.Range = {
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
            currentPosition.index = Evm.Utils.WORD_SIZE - baseSize.bytes;
          }
        }
      }

      let decodedChildren: Format.Values.Result[] = [];

      for (let childRange of ranges) {
        decodedChildren.push(
          yield* decodeStorage(
            dataType.baseType,
            { location: "storage" as const, range: childRange },
            info
          )
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
      try {
        data = yield* read(pointer, state);
      } catch (error) {
        if (error instanceof DecodingError) {
          return <Format.Errors.ErrorResult>{
            //no idea why TS is failing here
            type: dataType,
            kind: "error" as const,
            error: (<DecodingError>error).error
          };
        } else {
          throw error;
        }
      }

      let lengthByte = data[Evm.Utils.WORD_SIZE - 1];

      if (lengthByte % 2 == 0) {
        // string lives in word, length is last byte / 2
        length = lengthByte / 2;
        debug("in-word; length %o", length);

        return yield* Bytes.Decode.decodeBytes(
          dataType,
          {
            location: "storage",
            range: {
              from: { slot: pointer.range.from.slot, index: 0 },
              to: { slot: pointer.range.from.slot, index: length - 1 }
            }
          },
          info
        );
      } else {
        let lengthAsBN: BN = Conversion.toBN(data)
          .subn(1)
          .divn(2);
        try {
          length = lengthAsBN.toNumber();
        } catch (_) {
          return <
            | Format.Errors.BytesDynamicErrorResult
            | Format.Errors.StringErrorResult
          >{
            //again with the TS failures...
            type: dataType,
            kind: "error" as const,
            error: {
              kind: "OverlongArraysAndStringsNotImplementedError" as const,
              lengthAsBN
            }
          };
        }
        debug("new-word, length %o", length);

        return yield* Bytes.Decode.decodeBytes(
          dataType,
          {
            location: "storage" as const,
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
          },
          info
        );
      }
    }

    case "struct": {
      const typeId = dataType.id;
      const structAllocation = allocations[typeId];
      if (!structAllocation) {
        return {
          type: dataType,
          kind: "error" as const,
          error: {
            kind: "UserDefinedTypeNotFoundError" as const,
            type: dataType
          }
        };
      }

      let decodedMembers: Format.Values.NameValuePair[] = [];
      const members = structAllocation.members;

      for (let index = 0; index < members.length; index++) {
        const memberAllocation = members[index];
        const memberPointer = <Pointer.StoragePointer>memberAllocation.pointer;
        //the type system thinks memberPointer might also be a constant
        //definition pointer.  However, structs can't contain constants,
        //so *we* know it's not, and can safely coerce it.
        debug("pointer %O", pointer);
        const childRange: Storage.Range = {
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
          }
        };

        let storedType = <Format.Types.StructType>info.userDefinedTypes[typeId];
        if (!storedType) {
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
        let memberType = Format.Types.specifyLocation(
          storedMemberType,
          "storage" as const
        );

        decodedMembers.push({
          name: memberAllocation.name,
          value: yield* decodeStorage(
            memberType,
            { location: "storage" as const, range: childRange },
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
      let valueSize: Storage.StorageLength;
      try {
        valueSize = storageSize(valueType, info.userDefinedTypes, allocations);
      } catch (error) {
        //error: DecodingError
        debug("couldn't get value size! error: %o", error);
        if (error instanceof DecodingError) {
          return {
            type: dataType,
            kind: "error" as const,
            error: (<DecodingError>error).error
          };
        } else {
          throw error;
        }
      }

      let decodedEntries: Format.Values.KeyValuePair[] = [];

      const baseSlot: Storage.Slot = pointer.range.from.slot;
      debug("baseSlot %o", baseSlot);
      debug("base slot address %o", Utils.slotAddress(baseSlot));

      const keySlots = info.mappingKeys.filter(({ path }) =>
        Utils.slotAddress(baseSlot).eq(Utils.slotAddress(path))
      );

      for (const { key } of keySlots) {
        let valuePointer: Pointer.StoragePointer;

        if (Utils.isWordsLength(valueSize)) {
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
                index: Evm.Utils.WORD_SIZE - 1
              }
            }
          };
        } else {
          valuePointer = {
            location: "storage",
            range: {
              from: {
                slot: {
                  key,
                  path: baseSlot,
                  offset: new BN(0)
                },
                index: Evm.Utils.WORD_SIZE - valueSize.bytes
              },
              to: {
                slot: {
                  key,
                  path: baseSlot,
                  offset: new BN(0)
                },
                index: Evm.Utils.WORD_SIZE - 1
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

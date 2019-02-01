import debugModule from "debug";
const debug = debugModule("decoder:decode:storage");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import decode from "./index";
import decodeValue from "./value";
import { StoragePointer, DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { storageSize } from "../allocate/storage";
import * as Types from "../types/storage";
import BN from "bn.js";
import Web3 from "web3";
import { EvmStruct, EvmMapping } from "../interface/contract-decoder";

export default async function decodeStorage(definition: DecodeUtils.AstDefinition, pointer: StoragePointer, info: EvmInfo, web3?: Web3, contractAddress?: string): Promise <any> {
  if(DecodeUtils.Definition.isReference(definition) || DecodeUtils.Definition.isMapping(definition)) {
    //note that mappings are not caught by isReference and must be checked for separately
    return await decodeStorageReference(definition, pointer, info, web3, contractAddress);
  }
  else {
    return await decodeValue(definition, pointer, info, web3, contractAddress);
  }
}

//decodes storage at the address *read* from the pointer -- hence why this takes DataPointer rather than StoragePointer.
//NOTE: ONLY for use with pointers to reference types!
//Of course, pointers to value types don't exist in Solidity, so that warning is redundant, but...
export async function decodeStorageByAddress(definition: DecodeUtils.AstDefinition, pointer: DataPointer, info: EvmInfo, web3?: Web3, contractAddress?: string): Promise <any> {

  const rawValue: Uint8Array = await read(pointer, info.state, web3, contractAddress);
  const startOffset = DecodeUtils.Conversion.toBN(rawValue);
  //we *know* the type being decoded must be sized in words, because it's a
  //reference type, but TypeScript doesn't, so we'll have to use a type
  //coercion
  const size = (<{words: number}>storageSize(definition)).words;
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
  return await decodeStorageReference(definition, newPointer, info, web3, contractAddress);
}

export async function decodeStorageReference(definition: DecodeUtils.AstDefinition, pointer: StoragePointer, info: EvmInfo, web3?: Web3, contractAddress?: string): Promise<any> {
  var data;
  var length;

  const { state } = info;

  switch (DecodeUtils.Definition.typeClass(definition)) {
    case "array": {
      debug("storage array! %o", pointer);
      if (DecodeUtils.Definition.isDynamicArray(definition)) {
        debug("dynamic array");
        debug("definition %O", definition);
        data = await read(pointer, state, web3, contractAddress);

        length = DecodeUtils.Conversion.toBN(data).toNumber();
      }
      else {
        debug("static array");
        length = DecodeUtils.Definition.staticLength(definition);
      }
      debug("length %o", length);

      const baseDefinition = definition.baseType || definition.typeName.baseType;
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

      const decodePromises = ranges.map( (childRange, idx) => {
        debug("childFrom %d, %o", idx, childRange.from);
        return decode(baseDefinition, {
          storage: childRange
        }, info, web3, contractAddress);
      });

      return await Promise.all(decodePromises);
    }

    case "bytes":
    case "string": {
      data = await read(pointer, state, web3, contractAddress);
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
        if (length == 0) {
          return "";
        }

        return decodeValue(definition, { storage: {
          from: { slot: pointer.storage.from.slot, index: 0 },
          to: { slot: pointer.storage.from.slot, index: length - 1}
        }}, info, web3, contractAddress);

      } else {
        length = DecodeUtils.Conversion.toBN(data).subn(1).divn(2).toNumber();
        debug("new-word, length %o", length);

        return decodeValue(definition, {
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
        }, info, web3, contractAddress);
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

      const members: DecodeUtils.AstDefinition[] =
        info.referenceDeclarations[referencedDeclaration].members;

      const structAllocation = info.storageAllocations[referencedDeclaration];
      for (let i = 0; i < members.length; i++) {
        const memberAllocation = structAllocation.members[members[i].id];
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
        const val = await decode(
          members[i],
          {storage: childRange}, info, web3, contractAddress
        );

        result.members[members[i].name] = {
          name: members[i].name,
          type: DecodeUtils.Definition.typeClass(members[i]),
          value: val
        };
      }

      return result;
    }

    case "mapping": {

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

      if (info.mappingKeys && typeof info.mappingKeys[definition.id] !== "undefined") {
        const keys: any[] = info.mappingKeys[definition.id];
        for (const key of keys) {

          let keyEncoding: string;
          //keyEncoding is used to let soliditySha3 know how to interpret the
          //key for hashing... but if you just give it the honest type, it
          //won't pad, and for value types we need it to pad.
          //Thus, ints and value bytes become the *largest* size of that type
          //addresses are treated by Solidity as uint160, so we mark them uint
          //to get the correct padding
          //bool... I can't get soliditySha3 to pad a bool no matter what, so
          //we'll leave it undefined and handle it manually
          //note that while fixed and ufixed don't exist yet, they would
          //presumably use fixed256xM and ufixed256xM, where M is the precision

          switch(DecodeUtils.Definition.typeClass(keyDefinition)) {
            case "string":
              keyEncoding = "string";
              break;
            case "bytes":
              let keySize = DecodeUtils.Definition.specifiedSize(keyDefinition);
              if(keySize === null) {
                keyEncoding = "bytes";
              }
              else {
                keyEncoding = "bytes32";
              }
              break;
            case "uint":
            case "address":
              keyEncoding = "uint";
              break;
            case "int":
              keyEncoding = "int";
              break;
            case "bool":
              //deliberately leave keyEncoding undefined (HACK)
              break;
          }

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
            await decode(valueDefinition, valuePointer, info, web3, contractAddress);
        }
      }

      return result;
    }

    default: {
      debug("Unknown storage reference type: %s", DecodeUtils.Definition.typeIdentifier(definition));
      return undefined;
    }
  }
}

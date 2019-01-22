import debugModule from "debug";
const debug = debugModule("decoder:decode:storage");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import decode from "./index";
import decodeValue from "./value";
import { StoragePointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { Allocation } from "truffle-decode-utils";
import { storageSize, storageLengthToBytes } from "../allocate/storage";
import BN from "bn.js";
import Web3 from "web3";
import { EvmStruct, EvmMapping } from "../interface/contract-decoder";
import clonedeep from "lodash.clonedeep";

export default async function decodeStorageReference(definition: DecodeUtils.AstDefinition, pointer: StoragePointer, info: EvmInfo, web3?: Web3, contractAddress?: string): Promise<any> {
  var data;
  var length;

  const { state } = info;

  switch (DecodeUtils.Definition.typeClass(definition)) {
    case "array": {
      debug("storage array! %o", pointer);
      if (DecodeUtils.Definition.isDynamicArray(definition)) {
        data = await read(pointer, state, web3, contractAddress);
        if (!data) {
          return undefined;
        }

        length = DecodeUtils.Conversion.toBN(data).toNumber();
      }
      else {
        length = definition.typeName
          ? parseInt(definition.typeName.length.value)
          : parseInt(definition.length.value);
      }
      debug("length %o", length);

      const baseDefinition = DecodeUtils.Definition.baseDefinition(definition);
      const referenceId = baseDefinition.referencedDeclaration ||
        (baseDefinition.typeName ? baseDefinition.typeName.referencedDeclaration : undefined);

      debug("about to determine baseSize");
      let baseSize: number = storageLengthToBytes(storageSize(baseDefinition, info.referenceDeclarations, info.storageAllocations));
      debug("baseSize %o", baseSize);
        //temporary HACK until I go through the decoder -- this will be fixed in next PR!

      const perWord = Math.floor(DecodeUtils.EVM.WORD_SIZE / baseSize);
      debug("perWord %d", perWord);

      const offset = (i: number): number => {
        if (perWord == 1) {
          return i;
        }

        return Math.floor(i * baseSize / DecodeUtils.EVM.WORD_SIZE);
      }

      const index = (i: number) => {
        if (perWord == 1) {
          return DecodeUtils.EVM.WORD_SIZE - baseSize;
        }

        const position = perWord - i % perWord - 1;
        return position * baseSize;
      }

      let from = {
        slot: {
          ...pointer.storage.from.slot
        },
        index: pointer.storage.from.index
      };

      debug("pointer: %o", pointer);
      let ranges: Allocation.Range[] = [];
      let currentReference: Allocation.StorageReference = {
        slot: {
          path: from.slot || undefined,
          offset: new BN(0),
          hashPath: DecodeUtils.Definition.isDynamicArray(definition)
        },
        index: DecodeUtils.EVM.WORD_SIZE - 1
      };

      for (let i = 0; i < length; i++) {
        currentReference.index -= baseSize - 1;
        if (currentReference.index < 0) {
          currentReference.slot.offset = currentReference.slot.offset.addn(1);
          currentReference.index = DecodeUtils.EVM.WORD_SIZE - baseSize;
        }

        let childRange = <Allocation.Range>{
          from: {
            slot: {
              path: currentReference.slot.path,
              offset: currentReference.slot.offset.clone(),
              hashPath: currentReference.slot.hashPath
            },
            index: currentReference.index
          },
          length: baseSize
        };

        currentReference.index -= 1;

        ranges.push(childRange);
      }

      const decodePromises = ranges.map( (childRange, idx) => {
        debug("childFrom %d, %o", idx, childRange.from);
        return decode(DecodeUtils.Definition.baseDefinition(definition), <StoragePointer>{
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

        return decodeValue(definition, <StoragePointer>{
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
        const memberPointer = memberAllocation.pointer;
        debug("pointer %O", pointer);
        const childRange = <Allocation.Range>{
          from: {
            slot: {
              path: clonedeep(pointer.storage.from.slot),
              offset: memberPointer.storage.from.slot.offset.clone()
              //note that memberPointer should have no path
            },
            index: memberPointer.storage.from.index
          },
          to: {
            slot: {
              path: clonedeep(pointer.storage.from.slot),
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
      const result = <EvmMapping>{
        name: definition.name,
        type: "mapping",
        id: definition.id,
        keyType: DecodeUtils.Definition.typeClass(definition.typeName.keyType),
        valueType: DecodeUtils.Definition.typeClass(definition.typeName.valueType),
        members: {}
      };

      const baseSlot: Allocation.Slot = pointer.storage.from.slot;

      if (info.mappingKeys && typeof info.mappingKeys[definition.id] !== "undefined") {
        const keys: any[] = info.mappingKeys[definition.id];
        for (const key of keys) {
          const keyValue = DecodeUtils.Conversion.toBytes(key);

          const valuePointer: StoragePointer = {
            storage: {
              from: {
                slot: <Allocation.Slot>{
                  key: key,
                  path: baseSlot || undefined,
                  offset: new BN(0)
                },
                index: 0
              },
              to: {
                slot: <Allocation.Slot>{
                  key: key,
                  path: baseSlot || undefined,
                  offset: new BN(0)
                },
                index: 31
              }
            }
          };

          let memberName: string;
          if (typeof key === "string") {
            memberName = key;
          }
          else {
            memberName = keyValue.toString();
          }

          result.members[memberName] =
            await decode(definition.typeName.valueType, valuePointer, info, web3, contractAddress);
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

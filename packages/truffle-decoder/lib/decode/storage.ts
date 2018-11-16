import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import decode from "./index";
import decodeValue from "./value";
import { StoragePointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { Allocation } from "truffle-decode-utils";
import BN from "bn.js";
import Web3 from "web3";
import { EvmStruct, EvmMapping, EvmEnum } from "../interface/contract-decoder";
import clonedeep from "lodash.clonedeep";

function prefixPointer(child: StoragePointer, parentSlot: Allocation.Slot): StoragePointer {
  let result: StoragePointer = clonedeep(child);

  let obj = result.storage.from.slot;
  while (obj.path && typeof obj.path.path !== "undefined") {
    obj = obj.path;
  }

  obj.path = clonedeep(parentSlot);

  /*let obj2 = result.storage.to.slot;
  while (typeof obj2.path !== "undefined") {
    obj2 = obj2.path;
  }

  obj2.path = clonedeep(parentSlot);*/

  return result;
}

export default async function decodeStorageReference(definition: DecodeUtils.AstDefinition, pointer: StoragePointer, info: EvmInfo, web3?: Web3, contractAddress?: string): Promise<any> {
  var data;
  var length;

  const { state } = info;

  switch (DecodeUtils.Definition.typeClass(definition)) {
    case "array": {
      // debug("storage array! %o", pointer);
      if (definition.typeName.length === null) {
        data = await read(pointer, state, web3, contractAddress);
        if (!data) {
          return undefined;
        }

        length = DecodeUtils.Conversion.toBN(data).toNumber();
      }
      else {
        length = parseInt(definition.typeName.length.value);
      }
      // debug("length %o", length);

      const baseDefinition = DecodeUtils.Definition.baseDefinition(definition);
      const referenceId = baseDefinition.referencedDeclaration ||
        (baseDefinition.typeName ? baseDefinition.typeName.referencedDeclaration : undefined);

      let baseSize: number;
      if (typeof referenceId !== "undefined" && typeof info.referenceDeclarations !== "undefined") {
        const referenceDeclaration: undefined | DecodeUtils.AstDefinition = info.referenceDeclarations[referenceId];
        baseSize = DecodeUtils.Definition.storageSize(baseDefinition, referenceDeclaration);
      }
      else {
        baseSize = DecodeUtils.Definition.storageSize(baseDefinition);
      }

      const perWord = Math.floor(DecodeUtils.EVM.WORD_SIZE / baseSize);
      // debug("baseSize %o", baseSize);
      // debug("perWord %d", perWord);

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

      // debug("pointer: %o", pointer);
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
        // debug("childFrom %d, %o", idx, childFrom);
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

      // debug("data %O", data);
      let lengthByte = data[DecodeUtils.EVM.WORD_SIZE - 1];
      if (!lengthByte) {
        lengthByte = 0;
      }

      if (lengthByte % 2 == 0) {
        // string lives in word, length is last byte / 2
        length = lengthByte / 2;
        // debug("in-word; length %o", length);
        if (length == 0) {
          return "";
        }

        return decodeValue(definition, { storage: {
          from: { slot: pointer.storage.from.slot, index: 0 },
          to: { slot: pointer.storage.from.slot, index: length - 1}
        }}, info, web3, contractAddress);

      } else {
        length = DecodeUtils.Conversion.toBN(data).subn(1).divn(2).toNumber();
        // debug("new-word, length %o", length);

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
      const { scopes } = info;

      const referencedDeclaration = (definition.typeName)
        ? definition.typeName.referencedDeclaration
        : definition.referencedDeclaration;

      // TODO: this is ugly, this should be one conformed method, will fix at some later point
      if (typeof scopes[referencedDeclaration] !== "undefined") {
        // debugger way
        const variables = (scopes[referencedDeclaration] || {}).variables || [];

        let slot: DecodeUtils.Allocation.Slot;
        if (pointer.storage != undefined) {
          slot = pointer.storage.from.slot;
        } else {
          slot = DecodeUtils.Allocation.normalizeSlot(DecodeUtils.Conversion.toBN(await read(pointer, state, web3, contractAddress)));
        }

        const allocation = DecodeUtils.Allocation.allocateDeclarations(variables, scopes, slot);

        return Object.assign(
          {}, ...Object.entries(allocation.children)
            .map( ([id, childPointer]) => ({
              [childPointer.name]: decode(
                scopes[id].definition, { storage: childPointer }, info, web3, contractAddress
              )
            }))
        );
      }
      else {
        // seese's way
        let result: EvmStruct = {
          name: definition.name,
          type: info.referenceDeclarations[referencedDeclaration].name,
          members: {}
        };

        const members: DecodeUtils.AstDefinition[] = info.referenceDeclarations[referencedDeclaration].members;
        const referenceVariable = info.referenceVariables[referencedDeclaration];
        for (let i = 0; i < members.length; i++) {
          const variableRef = referenceVariable.members[members[i].id];
          const pointer = prefixPointer(variableRef.pointer, info.variables[definition.id].pointer.storage.from.slot);
          const val = await decode(
            members[i],
            pointer, info, web3, contractAddress
          );

          result.members[members[i].name] = {
            name: members[i].name,
            type: DecodeUtils.Definition.typeClass(members[i]),
            value: val
          };
        }

        return result;
      }
    }

    case "enum": {
      data = await read(pointer, state, web3, contractAddress);
      if (data == undefined) {
        return undefined;
      }

      const numRepresentation = DecodeUtils.Conversion.toBN(data).toNumber();
      const referenceId = definition.referencedDeclaration ||
        (definition.typeName ? definition.typeName.referencedDeclaration : undefined);
      const enumDeclaration = info.referenceDeclarations[referenceId];
      const decodedValue = enumDeclaration.members[numRepresentation].name;

      return <EvmEnum>{
        type: enumDeclaration.name,
        value: enumDeclaration.name + "." + decodedValue
      }
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
          // debug("keyPointer %o", keyPointer);

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
      // debug("Unknown storage reference type: %s", DecodeUtils.typeIdentifier(definition));
      return undefined;
    }
  }
}

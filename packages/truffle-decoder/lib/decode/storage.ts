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

export default async function decodeStorageReference(definition: DecodeUtils.AstDefinition, pointer: StoragePointer, info: EvmInfo, web3?: Web3, contractAddress?: string): Promise<any> {
  var data;
  var length;

  const { state } = info;

  switch (DecodeUtils.Definition.typeClass(definition)) {
    case "array":
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
      const referenceDeclaration: undefined | DecodeUtils.AstDefinition =
        DecodeUtils.Definition.typeClass(baseDefinition) === "enum" ?
          info.referenceDeclarations[baseDefinition.typeName.referencedDeclaration]
        :
          undefined;
      const baseSize = DecodeUtils.Definition.storageSize(baseDefinition, referenceDeclaration);
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


        ranges.push(childRange);
      }

      const decodePromises = ranges.map( (childRange, idx) => {
        // debug("childFrom %d, %o", idx, childFrom);
        return decode(DecodeUtils.Definition.baseDefinition(definition), <StoragePointer>{
          storage: childRange
        }, info, web3, contractAddress);
      });

      return await Promise.all(decodePromises);

    case "bytes":
    case "string":
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
                path: {
                  path: pointer.storage.from.slot.path || undefined,
                  offset: pointer.storage.from.slot.offset
                },
                offset: new BN(0)
              },
              index: 0
            },
            length
          }
        }, info, web3, contractAddress);
      }

    case "struct":
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
        for (let i = 0; i < members.length; i++) {
          const variableRef = info.variables[members[i].id];
          const val = await decode(
            variableRef.definition,
            variableRef.pointer, info, web3, contractAddress
          );

          result.members[variableRef.definition.name] = {
            name: variableRef.definition.name,
            type: DecodeUtils.Definition.typeClass(variableRef.definition),
            value: val
          };
        }

        return result;
      }

    case "enum": {
      data = await read(pointer, state, web3, contractAddress);
      if (data == undefined) {
        return undefined;
      }

      const numRepresentation = DecodeUtils.Conversion.toBN(data).toNumber();
      const enumDeclaration = info.referenceDeclarations[definition.typeName.referencedDeclaration];
      const decodedValue = enumDeclaration.members[numRepresentation].name;

      return <EvmEnum>{
        name: definition.name,
        type: definition.typeName.name,
        value: definition.typeName.name + "." + decodedValue
      }
    }

    case "mapping":

      return <EvmMapping>{
        name: definition.name,
        type: "mapping",
        id: definition.id,
        keyType: DecodeUtils.Definition.typeClass(definition.typeName.keyType),
        valueType: DecodeUtils.Definition.typeClass(definition.typeName.valueType),
        members: {}
      };

    default:
      // debug("Unknown storage reference type: %s", DecodeUtils.typeIdentifier(definition));
      return undefined;
  }
}

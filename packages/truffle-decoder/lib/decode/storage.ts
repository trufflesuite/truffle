import read from "../read";
import * as utils from "../utils";
import decode from "./index";
import decodeValue from "./value";
import { AstDefinition } from "../types/ast";
import { StoragePointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { Allocation } from "../utils";
import BN from "bn.js";
import Web3 from "web3";
import { EvmStruct, EvmMapping } from "../interface/contract-decoder";

export default async function decodeStorageReference(definition: AstDefinition, pointer: StoragePointer, info: EvmInfo, web3?: Web3, contractAddress?: string): Promise<any> {
  var data;
  var length;

  const { state } = info;

  switch (utils.Definition.typeClass(definition)) {
    case "array":
      // debug("storage array! %o", pointer);
      data = await read(pointer, state, web3, contractAddress);
      if (!data) {
        return undefined;
      }

      length = utils.Conversion.toBN(data).toNumber();
      // debug("length %o", length);

      const baseSize = utils.Definition.storageSize(utils.Definition.baseDefinition(definition));
      const perWord = Math.floor(utils.EVM.WORD_SIZE / baseSize);
      // debug("baseSize %o", baseSize);
      // debug("perWord %d", perWord);

      const offset = (i: number): number => {
        if (perWord == 1) {
          return i;
        }

        return Math.floor(i * baseSize / utils.EVM.WORD_SIZE);
      }

      const index = (i: number) => {
        if (perWord == 1) {
          return utils.EVM.WORD_SIZE - baseSize;
        }

        const position = perWord - i % perWord - 1;
        return position * baseSize;
      }

      let from = {
        slot: pointer.storage.from.slot,
        index: pointer.storage.from.index
      };

      // debug("pointer: %o", pointer);
      const fromSlots = [...Array(length).keys()]
      .map( (i) => {
        let childFrom: Allocation.StorageReference = {
          slot: {
            path: from.slot.path || undefined,
            offset: new BN(offset(i)),
          },
          index: index(i)
        };
        return childFrom;
      });

      const decodePromises = fromSlots.map( (childFrom, idx) => {
        // debug("childFrom %d, %o", idx, childFrom);
        return decode(utils.Definition.baseDefinition(definition), <StoragePointer>{
          storage: {
            from: childFrom,
            length: baseSize
          }
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
      let lengthByte = data[utils.EVM.WORD_SIZE - 1];
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
        length = utils.Conversion.toBN(data).subn(1).divn(2).toNumber();
        // debug("new-word, length %o", length);

        return decodeValue(definition, <StoragePointer>{
          storage: {
            from: {
              slot: {
                path: {
                  path: pointer.storage.from.slot.path || undefined,
                  offset: pointer.storage.from.slot.offset,
                  hashOffset: true
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

        let slot: utils.Allocation.Slot;
        if (pointer.storage != undefined) {
          slot = pointer.storage.from.slot;
        } else {
          slot = utils.Allocation.normalizeSlot(utils.Conversion.toBN(await read(pointer, state, web3, contractAddress)));
        }

        const allocation = utils.Allocation.allocateDeclarations(variables, scopes, slot);

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

        const members: AstDefinition[] = info.referenceDeclarations[referencedDeclaration].members;
        for (let i = 0; i < members.length; i++) {
          const variableRef = info.variables[members[i].id];
          const val = await decode(
            variableRef.definition,
            variableRef.pointer, info, web3, contractAddress
          );

          result.members[variableRef.definition.name] = {
            name: variableRef.definition.name,
            type: utils.Definition.typeClass(variableRef.definition),
            value: val
          };
        }

        return result;
      }

    case "mapping":

      return <EvmMapping>{
        name: definition.name,
        type: "mapping",
        id: definition.id,
        keyType: utils.Definition.typeClass(definition.typeName.keyType),
        valueType: utils.Definition.typeClass(definition.typeName.valueType),
        members: {}
      };

    default:
      // debug("Unknown storage reference type: %s", utils.typeIdentifier(definition));
      return undefined;
  }
}

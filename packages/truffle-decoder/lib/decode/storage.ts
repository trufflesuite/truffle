import read from "../read";
import * as utils from "../utils";
import decode from "./index";
import decodeValue from "./value";
import { AstDefinition } from "../types/ast";
import { StoragePointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { Allocation } from "../utils";
import BN from "bn.js";

export default function decodeStorageReference(definition: AstDefinition, pointer: StoragePointer, info: EvmInfo): any {
  var data;
  var length;

  const { state } = info;

  switch (utils.Definition.typeClass(definition)) {
    case "array":
      // debug("storage array! %o", pointer);
      data = read(pointer, state);
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
      return [...Array(length).keys()]
        .map( (i) => {
          let childFrom: Allocation.StorageReference = {
            slot: {
              path: from.slot.path || undefined,
              offset: new BN(offset(i)),
            },
            index: index(i)
          };
          return childFrom;
        })
        .map( (childFrom, idx) => {
          // debug("childFrom %d, %o", idx, childFrom);
          return decode(utils.Definition.baseDefinition(definition), <StoragePointer>{
            storage: {
              from: childFrom,
              length: baseSize
            }
          }, info);
        });

    case "bytes":
    case "string":
      data = read(pointer, state);
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
        }}, info);

      } else {
        length = utils.Conversion.toBN(data).subn(1).divn(2).toNumber();
        // debug("new-word, length %o", length);

        return decodeValue(definition, <StoragePointer>{
          storage: {
            from: {
              slot: pointer.storage.from.slot,
              index: 0
            },
            length
          }
        }, info);
      }

    case "struct":
      const { scopes } = info;

      const referencedDeclaration = (definition.typeName)
        ? definition.typeName.referencedDeclaration
        : definition.referencedDeclaration;

      const variables = (scopes[referencedDeclaration] || {}).variables || [];

      let slot: utils.Allocation.Slot;
      if (pointer.storage != undefined) {
        slot = pointer.storage.from.slot;
      } else {
        slot = utils.Allocation.normalizeSlot(utils.Conversion.toBN(read(pointer, state)));
      }

      const allocation = utils.Allocation.allocateDeclarations(variables, scopes, slot);

      return undefined; /*Object.assign( // TODO:
        {}, ...Object.entries(allocation.children)
          .map( ([id, childPointer: Datapoint]) => ({
            [childPointer.name]: decode(
              scopes[id].definition, { storage: childPointer }, info
            )
          }))
      );*/

    default:
      // debug("Unknown storage reference type: %s", utils.typeIdentifier(definition));
      return undefined;
  }
}

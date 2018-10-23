import debugModule from "debug";
const debug = debugModule("debugger:data:decode");

import {BigNumber} from "bignumber.js";

import * as memory from "./memory";
import * as storage from "./storage";
import * as utils from "./utils";
import { WORD_SIZE } from "./utils";

export function read(pointer, state) {
  if (pointer.stack != undefined && state.stack && pointer.stack < state.stack.length) {
    return state.stack[pointer.stack];
  } else if (pointer.storage != undefined && state.storage) {
    return storage.readRange(state.storage, pointer.storage);
  } else if (pointer.memory != undefined && state.memory) {
    return memory.readBytes(state.memory, pointer.memory.start, pointer.memory.length);
  } else if (pointer.literal != undefined) {
    return pointer.literal;
  }
}


export function decodeValue(definition, pointer, info) {
  const { state } = info;
  debug(
    "decoding value, pointer: %o, typeClass: %s",
    pointer, utils.typeClass(definition)
  );
  let bytes = read(pointer, state);
  if (bytes == undefined) {
    debug("segfault, pointer %o, state: %O", pointer, state);
    return undefined;
  }

  switch (utils.typeClass(definition)) {
    case "bool":
      return !utils.toBigNumber(bytes).isZero();

    case "uint":
      return utils.toBigNumber(bytes);

    case "int":
      return utils.toSignedBigNumber(bytes);

    case "address":
      return utils.toHexString(bytes, true);

    case "bytes":
      debug("typeIdentifier %s %o", utils.typeIdentifier(definition), bytes);
      // HACK bytes may be getting passed in as a literal hexstring
      if (typeof bytes == "string") {
        return bytes;
      }
      let length = utils.specifiedSize(definition);
      return utils.toHexString(bytes, length);

    case "string":
    case "stringliteral":
      debug("typeIdentifier %s %o", utils.typeIdentifier(definition), bytes);
      if (typeof bytes == "string") {
        return bytes;
      }
      return String.fromCharCode.apply(undefined, bytes);

    case "rational":
      debug("typeIdentifier %s %o", utils.typeIdentifier(definition), bytes);
      return utils.toBigNumber(bytes);

    default:
      debug("Unknown value type: %s", utils.typeIdentifier(definition));
      return undefined;
  }
}

export function decodeMemoryReference(definition, pointer, info) {
  const { state } = info;
  debug("pointer %o", pointer);
  let rawValue = read(pointer, state);
  if (rawValue == undefined) {
    return undefined;
  }

  rawValue = utils.toBigNumber(rawValue).toNumber();

  var bytes;
  switch (utils.typeClass(definition)) {

    case "bytes":
    case "string":
      bytes = read({
        memory: { start: rawValue, length: WORD_SIZE}
      }, state); // bytes contain length

      let childPointer = {
        memory: { start: rawValue + WORD_SIZE, length: bytes }
      };

      return decodeValue(definition, childPointer, info);

    case "array":
      bytes = utils.toBigNumber(read({
        memory: { start: rawValue, length: WORD_SIZE },
      }, state)).toNumber();  // bytes contain array length

      bytes = read({ memory: {
        start: rawValue + WORD_SIZE, length: bytes * WORD_SIZE
      }}, state); // now bytes contain items

      return memory.chunk(bytes, WORD_SIZE)
        .map(
          (chunk) => decode(utils.baseDefinition(definition), {
            literal: chunk
          }, info)
        );

    case "struct":
      const { scopes } = info;

      // Declaration reference usually appears in `typeName`, but for
      // { nodeType: "FunctionCall", kind: "structConstructorCall" }, this
      // reference appears to live in `expression`
      const referencedDeclaration = (definition.typeName)
        ? definition.typeName.referencedDeclaration
        : definition.expression.referencedDeclaration;

      let { variables } = (scopes[referencedDeclaration] || {});

      return Object.assign(
        {}, ...(variables || [])
          .map(
            ({name, id}, i) => {
              let memberDefinition = scopes[id].definition;
              let memberPointer = {
                memory: { start: rawValue + i * WORD_SIZE, length: WORD_SIZE }
              };
              // let memberPointer = memory.read(state.memory, pointer + i * WORD_SIZE);

              // HACK
              memberDefinition = {
                ...memberDefinition,

                typeDescriptions: {
                  ...memberDefinition.typeDescriptions,

                  typeIdentifier:
                    memberDefinition.typeDescriptions.typeIdentifier
                      .replace(/_storage_/g, "_memory_")
                }
              };

              return {
                [name]: decode(
                  memberDefinition, memberPointer, info
                )
              };
            }
          )
      );


    default:
      debug("Unknown memory reference type: %s", utils.typeIdentifier(definition));
      return undefined;

  }

}

export function decodeStorageReference(definition, pointer, info) {
  var data;
  var bytes;
  var length;
  var slot;

  const { state } = info;

  switch (utils.typeClass(definition)) {
    case "array":
      debug("storage array! %o", pointer);
      data = read(pointer, state);
      if (!data) {
        return undefined;
      }

      length = utils.toBigNumber(data).toNumber();
      debug("length %o", length);

      const baseSize = utils.storageSize(utils.baseDefinition(definition));
      const perWord = Math.floor(WORD_SIZE / baseSize);
      debug("baseSize %o", baseSize);
      debug("perWord %d", perWord);

      const offset = (i) => {
        if (perWord == 1) {
          return i;
        }

        return Math.floor(i * baseSize / WORD_SIZE);
      };

      const index = (i) => {
        if (perWord == 1) {
          return WORD_SIZE - baseSize;
        }

        const position = perWord - i % perWord - 1;
        return position * baseSize;
      };

      let from = {
        slot: utils.normalizeSlot(pointer.storage.from.slot),
        index: pointer.storage.from.index
      };

      debug("pointer: %o", pointer);
      return [...Array(length).keys()]
        .map( (i) => {
          let childFrom = {
            slot: {
              path: (from.slot.path instanceof Array)
                ? from.slot.path
                : [from.slot],
              offset: offset(i),
            },
            index: index(i)
          };
          return childFrom;
        })
        .map( (childFrom, idx) => {
          debug("childFrom %d, %o", idx, childFrom);
          return decode(utils.baseDefinition(definition), { storage: {
            from: childFrom,
            length: baseSize
          }}, info);
        });

    case "bytes":
    case "string":
      data = read(pointer, state);
      if (data == undefined) {
        return undefined;
      }

      debug("data %O", data);
      let lengthByte = data[WORD_SIZE - 1];
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
        }}, info);

      } else {
        length = utils.toBigNumber(data).minus(1).div(2).toNumber();
        debug("new-word, length %o", length);

        return decodeValue(definition, { storage: {
          from: { slot: [pointer.storage.from.slot], index: 0 },
          length
        }}, info);
      }

    case "struct":
      const { scopes } = info;

      const referencedDeclaration = (definition.typeName)
        ? definition.typeName.referencedDeclaration
        : definition.referencedDeclaration;

      const variables = (scopes[referencedDeclaration] || {}).variables || [];

      let slot;
      if (pointer.storage != undefined) {
        slot = pointer.storage.from.slot;
      } else {
        slot = utils.normalizeSlot(utils.toBigNumber(read(pointer, state)));
      }

      const allocation = utils.allocateDeclarations(variables, scopes, slot);

      return Object.assign(
        {}, ...Object.entries(allocation.children)
          .map( ([id, childPointer]) => ({
            [childPointer.name]: decode(
              scopes[id].definition, { storage: childPointer }, info
            )
          }))
      );

    default:
      debug("Unknown storage reference type: %s", utils.typeIdentifier(definition));
      return undefined;
  }
}

export function decodeMapping(definition, pointer, info) {
  if (definition.referencedDeclaration) {
    // attempting to decode reference to mapping, thus missing valid pointer
    return undefined;
  }

  const { mappingKeys } = info;

  debug("mapping %O", pointer);
  debug("mapping definition %O", definition);
  let keys = mappingKeys[utils.augmentWithDepth(definition.id)] || [];
  debug("known keys %o", keys);

  let keyDefinition = definition.typeName.keyType;
  let valueDefinition = definition.typeName.valueType;

  let baseSlot = pointer.storage.from.slot;
  if (!Array.isArray(baseSlot)) {
    baseSlot = [baseSlot];
  }

  let mapping = {};
  debug("mapping %O", mapping);
  for (let key of keys) {
    let keyPointer = { "literal": key };
    let valuePointer = {
      storage: {
        from: {
          slot: [key, ...baseSlot],
          index: 0
        },
        to: {
          slot: [key, ...baseSlot],
          index: 31
        }
      }
    };
    debug("keyPointer %o", keyPointer);

    // NOTE mapping keys are potentially lossy because JS only likes strings
    let keyValue = decode(keyDefinition, keyPointer, info);
    debug("keyValue %o", keyValue);
    if (keyValue != undefined) {
      mapping[keyValue.toString()] =
        decode(valueDefinition, valuePointer, info);
    }
  }

  return mapping;
}


export default function decode(definition, pointer, info) {
  if (pointer.literal != undefined) {
    return decodeValue(definition, pointer, info);
  }

  const identifier = utils.typeIdentifier(definition);
  if (utils.isReference(definition)) {
    switch (utils.referenceType(definition)) {
      case "memory":
        debug("decoding memory reference, type: %s", identifier);
        return decodeMemoryReference(definition, pointer, info);
      case "storage":
        debug("decoding storage reference, type: %s", identifier);
        return decodeStorageReference(definition, pointer, info);
      default:
        debug("Unknown reference category: %s", utils.typeIdentifier(definition));
        return undefined;
    }
  }

  if (utils.isMapping(definition)) {
    debug("decoding mapping, type: %s", identifier);
    return decodeMapping(definition, pointer, info);
  }

  debug("decoding value, type: %s", identifier);
  return decodeValue(definition, pointer, info);
}

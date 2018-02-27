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
  } else if (pointer.literal) {
    return pointer.literal;
  }
}


export function decodeValue(definition, pointer, state, ...args) {
  let bytes = read(pointer, state);
  if (!bytes) {
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

    case "string":
      return String.fromCharCode.apply(null, bytes);

    default:
      debug("Unknown value type: %s", utils.typeIdentifier(definition));
      return null;
  }
}

export function decodeMemoryReference(definition, pointer, state, ...args) {
  let rawValue = utils.toBigNumber(read(pointer, state)).toNumber();

  var bytes;
  switch (utils.typeClass(definition)) {

    case "string":
      bytes = read({
        memory: { start: rawValue, length: WORD_SIZE}
      }, state); // bytes contain length

      return decodeValue(definition, {
        memory: { start: rawValue + WORD_SIZE, length: bytes }
      }, state, ...args);

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
          }, state, ...args)
        )

    case "struct":
      let [refs] = args;
      let structDefinition = refs[definition.typeName.referencedDeclaration];
      let structVariables = structDefinition.variables || [];

      return Object.assign(
        {}, ...structVariables
          .map(
            ({name, id}, i) => {
              let memberDefinition = refs[id].definition;
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
                  memberDefinition, memberPointer, state, ...args
                )
              };
            }
          )
      );


    default:
      debug("Unknown memory reference type: %s", utils.typeIdentifier(definition));
      return null;

  }

}

export function decodeStorageReference(definition, pointer, state, ...args) {
  var data;
  var bytes;
  var length;
  var slot;

  switch (utils.typeClass(definition)) {
    case "array":
      debug("storage array! %o", pointer);
      data = read(pointer, state);
      if (!data) {
        return null;
      }

      length = utils.toBigNumber(data).toNumber();
      debug("length %o", length);

      let baseSize = utils.storageSize(utils.baseDefinition(definition));

      const offset = (i) => Math.floor(i * baseSize / WORD_SIZE);
      const index = (i) => i * baseSize % WORD_SIZE;

      return [...Array(length).keys()]
        .map( (i) => {
          debug("pointer: %o", pointer);
          let childFrom = pointer.storage.from.offset != undefined ?
            {
              slot: ["0x" + utils.toBigNumber(
                utils.keccak256(...pointer.storage.from.slot)
              ).plus(pointer.storage.from.offset).toString(16)],
              offset: offset(i),
              index: index(i)
            } : {
              slot: [pointer.storage.from.slot],
              offset: offset(i),
              index: index(i)
            };
          debug("childFrom %o: %o", i, childFrom);
          let lookup = read({ storage: { from: childFrom, length: baseSize }}, state);
          debug("done %o", i);
          return childFrom;
        })
        .map( (childFrom) => {
          return decode(utils.baseDefinition(definition), { storage: {
            from: childFrom,
            length: baseSize
          }}, state, ...args);
        });

    case "string":
      data = read(pointer, state);
      if (!data) {
        return null;
      }

      if (data[WORD_SIZE - 1] % 2 == 0) {
        // string lives in word, length is last byte / 2
        length = data[WORD_SIZE - 1] / 2;
        if (length == 0) {
          return "";
        }

        return decodeValue(definition, { storage: {
          from: { slot: pointer.storage.from.slot, index: 0 },
          to: { slot: pointer.storage.from.slot, index: length }
        }}, state, ...args);

      } else {
        length = utils.toBigNumber(data).minus(1).div(2).toNumber();
        debug("length %o", length);

        return decodeValue(definition, { storage: {
          from: { slot: [pointer.storage.from.slot], index: 0 },
          length
        }}, state, ...args);
      }

    case "struct":
      let [refs] = args;

      return Object.assign(
        {}, ...Object.entries(pointer.storage.children)
          .map( ([id, childPointer]) => ({
            [childPointer.name]: decode(
              refs[id].definition, { storage: childPointer }, state, ...args
            )
          }))
      );

      // return Object.assign(
      //   {}, ...structVariables
      //     .map(
      //       ({name, id}, i) => {
      //         let memberDefinition = refs[id].definition;
      //         let memberPointer = {
      //           storage: {

      //           }
      //         };

      //         // HACK
      //         memberDefinition = {
      //           ...memberDefinition,

      //           typeDescriptions: {
      //             ...memberDefinition.typeDescriptions,

      //             typeIdentifier:
      //               memberDefinition.typeDescriptions.typeIdentifier
      //           }
      //         };

      //         debug("name %s %O", name, memberDefinition);

      //         return {
      //           [name]: decode(
      //             memberDefinition, memberPointer, state, ...args
      //           )
      //         };
      //       }
      //     )
      // );

    default:
      debug("Unknown storage reference type: %s", utils.typeIdentifier(definition));
      return undefined;
  }
}



export default function decode(definition, ...args) {
  if (!utils.isReference(definition)) {
    return decodeValue(definition, ...args);
  }

  switch (utils.referenceType(definition)) {
    case "memory":
      return decodeMemoryReference(definition, ...args);
    case "storage":
      return decodeStorageReference(definition, ...args);
    default:
      debug("Unknown reference category: %s", utils.typeIdentifier(definition));
      return undefined;
  }
}

// export default function decode(definition, rawValue, state, refs) {
//   /*
//    * if reference type:
//    *   if memory:
//    *
//    * else if value type:
//    *   decodeValue(definition, valueBytes)
//    */
//   var length;
//   var bytes;

//   debug("definition: %o %o", definition.typeDescriptions, definition.typeName);
//   if (definition.typeName.referencedDeclaration) {
//     debug("referenced %o", refs[definition.typeName.referencedDeclaration]);
//   }

//   let mainType = definition.typeDescriptions.typeIdentifier
//     .match(/(t_[^$_]+)/)[0];

//   switch (mainType) {
//     case "t_string":
//       debug("rawValue: %o", rawValue.toNumber());

//       length = memory.read(state.memory, rawValue);
//       if (length == null) {
//         return null;
//       }
//       debug("length: %o", length);

//       bytes = memory.readBytes(state.memory, rawValue.plus(WORD_SIZE), length);
//       debug("bytes: %o", bytes.length);
//       return String.fromCharCode.apply(null, bytes);

//     default:
//       return rawValue.toNumber();
//   }
// }

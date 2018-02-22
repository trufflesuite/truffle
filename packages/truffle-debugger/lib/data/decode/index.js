import debugModule from "debug";
const debug = debugModule("debugger:data:decode");

import {BigNumber} from "bignumber.js";

import * as memory from "./memory";
import * as utils from "./utils";
import { WORD_SIZE } from "./utils";


export function decodeValue(definition, bytes) {
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
      let length = utils.toBigNumber(bytes.slice(0, WORD_SIZE)).toNumber();
      let characters = bytes.slice(WORD_SIZE, WORD_SIZE + length);
      return String.fromCharCode.apply(null, characters);

    default:
      debug("Unknown value type: %s", utils.typeIdentifier(definition));
      return null;
  }
}

export function decodeMemoryReference(definition, pointer, state) {
  pointer = utils.toBigNumber(pointer).toNumber();

  switch (utils.typeClass(definition)) {
    case "string":
      return decodeValue(definition, memory.readBytes(state.memory, pointer));
    case "array":
      let length = utils.toBigNumber(
        memory.read(state.memory, pointer) || [0x0]
      ).toNumber();
      debug("array length: %o", length);

      debug("array definition: %o", definition);

      let arrayBytes = memory.readBytes(
        state.memory, pointer + WORD_SIZE, length * WORD_SIZE
      );

      return memory.chunk(arrayBytes, WORD_SIZE)
        .map( (bytes) => decodeValue(definition.typeName.baseType, bytes) );

      // return decodeValue(definition, memory.readBytes(state.memory, pointer));
  }

}

export function decodeStorageReference(definition, pointer, state) {
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
      debug("Unknown reference type: %s", utils.typeIdentifier(definition));
      return null;
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

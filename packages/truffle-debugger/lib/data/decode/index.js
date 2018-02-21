import debugModule from "debug";
const debug = debugModule("debugger:data:decode");

import {BigNumber} from "bignumber.js";

import * as memory from "./memory";

const WORD_SIZE = 0x20;

export function decodeValue(definition, rawValue, {memory, storage}) {
}

export function decodeReference(definition, rawValue, {memory, storage}) {
}

export function decodeArray(definition, bytes) {
}



export default function decode(definition, rawValue, state, refs) {
  var length;
  var bytes;

  debug("definition: %o %o", definition.typeDescriptions, definition.typeName);
  if (definition.typeName.referencedDeclaration) {
    debug("referenced %o", refs[definition.typeName.referencedDeclaration]);
  }

  switch (definition.typeDescriptions.typeString) {
    case "string memory":
      debug("rawValue: %o", rawValue.toNumber());

      length = memory.read(state.memory, rawValue);
      if (length == null) {
        return null;
      }
      debug("length: %o", length);

      bytes = memory.readBytes(state.memory, rawValue.plus(WORD_SIZE), length);
      debug("bytes: %o", bytes.length);
      return String.fromCharCode.apply(null, bytes);

    default:
      return rawValue.toNumber();
  }
}

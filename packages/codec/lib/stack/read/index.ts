import debugModule from "debug";
const debug = debugModule("codec:stack:read");

import * as Evm from "@truffle/codec/evm";
import * as Pointer from "@truffle/codec/pointer";
import { DecodingError } from "@truffle/codec/errors";

export function readStack(
  pointer: Pointer.StackPointer,
  state: Evm.EvmState
): Uint8Array {
  let { from, to } = pointer;
  let { stack } = state;
  if (from < 0 || to >= stack.length) {
    throw new DecodingError({
      kind: "ReadErrorStack",
      from,
      to
    });
  }
  //unforunately, Uint8Arrays don't support concat; if they did the rest of
  //this would be one line.  Or similarly if they worked with lodash's flatten,
  //but they don't support that either.  But neither of those are the case, so
  //we'll have to concatenate a bit more manually.
  let words = stack.slice(from, to + 1);
  let result = new Uint8Array(words.length * Evm.Utils.WORD_SIZE);
  //shouldn't we total up the lengths? yeah, but each one should have a
  //length of 32, so unless somehting's gone wrong we can just multiply
  for (let index = 0; index < words.length; index++) {
    result.set(words[index], index * Evm.Utils.WORD_SIZE);
  }
  return result;
}

export function readStackLiteral(
  pointer: Pointer.StackLiteralPointer
): Uint8Array {
  return pointer.literal;
}

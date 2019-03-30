import debugModule from "debug";
const debug = debugModule("decoder:read:stack");

import * as DecodeUtils from "truffle-decode-utils";

export function readStack(stack: Uint8Array[], from: number, to: number): Uint8Array {
  if(from < 0 || to >= stack.length) {
    return undefined;
  }
  //unforunately, Uint8Arrays don't support concat; if they did the rest of
  //this would be one line.  Or similarly if they worked with lodash's flatten,
  //but they don't support that either.  But neither of those are the case, so
  //we'll have to concatenate a bit more manually.
  let words = stack.slice(from, to + 1);
  let result = new Uint8Array(words.length * DecodeUtils.EVM.WORD_SIZE);
    //shouldn't we total up the lengths? yeah, but each one should have a
    //length of 32, so unless somehting's gone wrong we can just multiply
  for(let index = 0; index < words.length; index++) {
    result.set(words[index], index * DecodeUtils.EVM.WORD_SIZE);
  }
  return result;
}

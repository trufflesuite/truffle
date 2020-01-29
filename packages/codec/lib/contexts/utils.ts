import debugModule from "debug";
const debug = debugModule("codec:contexts:utils");

import * as Evm from "@truffle/codec/evm";
import * as Format from "@truffle/codec/format";
import {
  DecoderContexts,
  DecoderContext,
  Context,
  Contexts,
  DebuggerContexts
} from "./types";
import escapeRegExp from "lodash.escaperegexp";

//I split these next two apart because the type system was giving me trouble
export function findDecoderContext(
  contexts: DecoderContexts,
  binary: string
): DecoderContext | null {
  debug("binary %s", binary);
  let context = Object.values(contexts).find(context =>
    matchContext(context, binary)
  );
  debug("context found: %O", context);
  return context !== undefined ? context : null;
}

export function findDebuggerContext(
  contexts: DebuggerContexts,
  binary: string
): string | null {
  debug("binary %s", binary);
  let context = Object.values(contexts).find(context =>
    matchContext(context, binary)
  );
  debug("context found: %O", context);
  return context !== undefined ? context.context : null;
}

export function matchContext(context: Context, givenBinary: string): boolean {
  let { binary, isConstructor } = context;
  let lengthDifference = givenBinary.length - binary.length;
  //first: if it's not a constructor, they'd better be equal in length.
  //if it is a constructor, the given binary must be at least as long,
  //and the difference must be a multiple of 64
  if (
    (!isConstructor && lengthDifference !== 0) ||
    lengthDifference < 0 ||
    lengthDifference % (2 * Evm.Utils.WORD_SIZE) !== 0
  ) {
    return false;
  }
  for (let i = 0; i < binary.length; i++) {
    //note: using strings like arrays is kind of dangerous in general in JS,
    //but everything here is ASCII so it's fine
    //note that we need to compare case-insensitive, since Solidity will
    //put addresses in checksum case in the compiled source
    //(we don't actually need that second toLowerCase(), but whatever)
    if (
      binary[i] !== "." &&
      binary[i].toLowerCase() !== givenBinary[i].toLowerCase()
    ) {
      return false;
    }
  }
  return true;
}

export function normalizeContexts(contexts: Contexts): Contexts {
  //unfortunately, due to our current link references format, we can't
  //really use the binary from the artifact directly -- neither for purposes
  //of matching, nor for purposes of decoding internal functions.  So, we
  //need to perform this normalization step on our contexts before using
  //them.  Once we have truffle-db, this step should largely go away.

  debug("normalizing contexts");

  //first, let's clone the input
  let newContexts: Contexts = { ...contexts };

  debug("contexts cloned");
  debug("cloned contexts: %O", newContexts);

  //next, we get all the library names and sort them descending by length.
  //We're going to want to go in descending order of length so that we
  //don't run into problems when one name is a substring of another.
  //For simplicity, we'll exclude names of length <38, because we can
  //handle these with our more general check for link references at the end
  const fillerLength = 2 * Evm.Utils.ADDRESS_SIZE;
  let names = Object.values(newContexts)
    .filter(context => context.contractKind === "library")
    .map(context => context.contractName)
    .filter(name => name.length >= fillerLength - 3)
    //the -3 is for 2 leading underscores and 1 trailing
    .sort((name1, name2) => name2.length - name1.length);

  debug("names sorted");

  //now, we need to turn all these names into regular expressions, because,
  //unfortunately, str.replace() will only replace all if you use a /g regexp;
  //note that because names may contain '$', we need to escape them
  //(also we prepend "__" because that's the placeholder format)
  let regexps = names.map(name => new RegExp(escapeRegExp("__" + name), "g"));

  debug("regexps prepared");

  //having done so, we can do the replace for these names!
  const replacement = ".".repeat(fillerLength);
  for (let regexp of regexps) {
    for (let context of Object.values(newContexts)) {
      context.binary = context.binary.replace(regexp, replacement);
    }
  }

  debug("long replacements complete");

  //now we can do a generic replace that will catch all names of length
  //<40, while also catching the Solidity compiler's link reference format
  //as well as Truffle's.  Hooray!
  const genericRegexp = new RegExp("_.{" + (fillerLength - 2) + "}_", "g");
  //we're constructing the regexp /_.{38}_/g, but I didn't want to use a
  //literal 38 :P
  for (let context of Object.values(newContexts)) {
    context.binary = context.binary.replace(genericRegexp, replacement);
  }

  debug("short replacements complete");
  //but there's one more step -- libraries' deployedBytecode will include
  //0s in place of their own address instead of a link reference at the
  //beginning, so we need to account for that too
  const pushAddressInstruction = (0x60 + Evm.Utils.ADDRESS_SIZE - 1).toString(
    16
  ); //"73"
  for (let context of Object.values(newContexts)) {
    if (context.contractKind === "library" && !context.isConstructor) {
      context.binary = context.binary.replace(
        "0x" + pushAddressInstruction + "00".repeat(Evm.Utils.ADDRESS_SIZE),
        "0x" + pushAddressInstruction + replacement
      );
    }
  }

  debug("extra library replacements complete");

  //finally, return this mess!
  return newContexts;
}

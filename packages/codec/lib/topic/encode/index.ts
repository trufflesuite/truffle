import debugModule from "debug";
const debug = debugModule("codec:topic:encode");

import * as Format from "@truffle/codec/format";
import * as Conversion from "@truffle/codec/conversion";
import * as Evm from "@truffle/codec/evm";
import * as BasicEncode from "@truffle/codec/basic/encode";

/**
 * Encodes for event topics (indexed parameters).
 * Warning: This function is not fully implemented yet!
 * @Category Encoding (low-level)
 */
export function encodeTopic(
  input: Format.Values.Result
): Uint8Array | undefined {
  //errors can't be encoded
  if (input.kind === "error") {
    debug("input: %O", input);
    //...unless it's an IndexedReferenceTypeError, in which
    //case, let's read otu that raw data!
    if (input.error.kind === "IndexedReferenceTypeError") {
      return Conversion.toBytes(input.error.raw, Evm.Utils.WORD_SIZE);
    } else {
      return undefined;
    }
  }
  //otherwise, just dispath to encodeBasic
  return BasicEncode.encodeBasic(input);
  //...of course, really here we should be checking
  //whether the input *is* a basic type, and if not, handling
  //that appropriately!  But so far we don't need this, so this
  //part of the function isn't implemented yet
}

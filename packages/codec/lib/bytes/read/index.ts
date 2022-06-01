import * as Evm from "@truffle/codec/evm";
import type * as Pointer from "@truffle/codec/pointer";
import { DecodingError } from "@truffle/codec/errors";
import type { DecoderRequest } from "@truffle/codec/types";

export function* readCode(
  pointer: Pointer.CodePointer,
  state: Evm.EvmState
): Generator<DecoderRequest, Uint8Array, Uint8Array | null> {
  let code = state.code;
  if (!code) {
    const address = Evm.Utils.toAddress(state.specials.this);
    code = yield {
      type: "code",
      address
    };
    if (code === null) {
      //check for null as a way to deliberately indicate an error
      throw new DecodingError({
        kind: "CodeNotSuppliedError" as const,
        address
      });
    }
  }
  return readBytes(pointer, { ...state, code });
}

export function readBytes(
  pointer: Pointer.BytesPointer,
  state: Evm.EvmState
): Uint8Array {
  let sourceBytes = state[pointer.location];

  const { start: offset, length } = pointer;
  if (!Number.isSafeInteger(offset + length)) {
    throw new DecodingError({
      kind: "ReadErrorBytes" as const,
      location: pointer.location,
      start: offset,
      length
    });
  }

  // grab `length` bytes no matter what, here fill this array
  var bytes = new Uint8Array(length);
  bytes.fill(0); //fill it wil zeroes to start

  //if the start is beyond the end of the source, just return those 0s
  if (offset >= sourceBytes.length) {
    return bytes;
  }

  // if we're reading past the end of the source, truncate the length to read
  let excess = offset + length - sourceBytes.length;
  let readLength;
  if (excess > 0) {
    readLength = sourceBytes.length - offset;
  } else {
    readLength = length;
  }

  //get the (truncated) bytes
  let existing = new Uint8Array(sourceBytes.buffer, offset, readLength);

  //copy it into our buffer
  bytes.set(existing);

  return bytes;
}

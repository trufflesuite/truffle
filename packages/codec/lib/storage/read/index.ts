import debugModule from "debug";
const debug = debugModule("codec:storage:read");

import * as Conversion from "@truffle/codec/conversion";
import * as Storage from "@truffle/codec/storage/types";
import * as Utils from "@truffle/codec/storage/utils";
import { DecoderRequest } from "@truffle/codec/types";
import * as Evm from "@truffle/codec/evm";
import * as Pointer from "@truffle/codec/pointer";
import { DecodingError } from "@truffle/codec/errors";
import BN from "bn.js";

export function* readSlot(
  storage: Evm.WordMapping,
  slot: Storage.Slot
): Generator<DecoderRequest, Uint8Array, Uint8Array> {
  const address: BN = Utils.slotAddress(slot);

  // debug("reading slot: %o", Conversion.toHexString(address));

  const hexAddress = Conversion.toHexString(address, Evm.Utils.WORD_SIZE);
  let word: Uint8Array = storage[hexAddress];

  //if we can't find the word in the map, we place a request to the invoker to supply it
  //(contract-decoder will look it up from the blockchain, while the debugger will just
  //say 0)
  if (word === undefined) {
    word = yield {
      type: "storage",
      slot: address
    };
  }

  return word;
}

export function* readStorage(
  pointer: Pointer.StoragePointer,
  state: Evm.EvmState
): Generator<DecoderRequest, Uint8Array, Uint8Array> {
  const { storage } = state;
  const { range } = pointer;
  debug("readRange %o", range);

  let { from, to, length } = range;

  from = {
    slot: from.slot,
    index: from.index || 0
  };

  if (length !== undefined) {
    to = {
      slot: {
        path: from.slot.path || undefined,
        offset: from.slot.offset.addn(
          Math.floor((from.index + length - 1) / Evm.Utils.WORD_SIZE)
        )
      },
      index: (from.index + length - 1) % Evm.Utils.WORD_SIZE
    };
  }

  debug("normalized readRange %o", { from, to });

  let totalWordsAsBN: BN = to.slot.offset.sub(from.slot.offset).addn(1);
  let totalWords: number;
  try {
    totalWords = totalWordsAsBN.toNumber();
  } catch (_) {
    throw new DecodingError({
      kind: "ReadErrorStorage" as const,
      range
    });
  }

  let data = new Uint8Array(totalWords * Evm.Utils.WORD_SIZE);

  for (let i = 0; i < totalWords; i++) {
    let offset = from.slot.offset.addn(i);
    const word = yield* readSlot(storage, { ...from.slot, offset });
    if (typeof word !== "undefined") {
      data.set(word, i * Evm.Utils.WORD_SIZE);
    }
  }
  debug("words %o", data);

  data = data.slice(
    from.index,
    (totalWords - 1) * Evm.Utils.WORD_SIZE + to.index + 1
  );

  debug("data: %o", data);

  return data;
}

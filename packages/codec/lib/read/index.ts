import * as storage from "./storage";
import * as bytes from "./bytes";
import * as stack from "./stack";
import * as constant from "./constant";
import { Pointer } from "@truffle/codec/types";
import * as Evm from "@truffle/codec/types/evm";
import { DecoderRequest } from "@truffle/codec/types/request";

export default function* read(pointer: Pointer.DataPointer, state: Evm.EvmState): Generator<DecoderRequest, Uint8Array, Uint8Array> {
  switch(pointer.location) {

    case "stack":
      return stack.readStack(state.stack, pointer.from, pointer.to);

    case "storage":
      return yield* storage.readRange(state.storage, pointer.range);

    case "memory":
      return bytes.readBytes(state.memory, pointer.start, pointer.length);

    case "calldata":
      return bytes.readBytes(state.calldata, pointer.start, pointer.length);

    case "eventdata":
      //similarly with eventdata
      return bytes.readBytes(state.eventdata, pointer.start, pointer.length);

    case "stackliteral":
      //nothing to do, just return it
      return pointer.literal;

    case "definition":
      return constant.readDefinition(pointer.definition);

    case "special":
      //this one is simple enough to inline
      //not bothering with error handling on this one as I don't expect errors
      return state.specials[pointer.special];

    case "eventtopic":
      //this one is simple enough to inline as well; similarly not bothering
      //with error handling
      return state.eventtopics[pointer.topic];
  }
}

import * as Storage from "@truffle/codec/storage";
import * as Stack from "@truffle/codec/stack";
import * as Bytes from "@truffle/codec/bytes";
import * as Ast from "@truffle/codec/ast";
import * as Pointer from "@truffle/codec/pointer";
import { DecoderRequest } from "@truffle/codec/types";
import * as Evm from "@truffle/codec/evm";

export default function* read(
  pointer: Pointer.DataPointer,
  state: Evm.EvmState
): Generator<DecoderRequest, Uint8Array, Uint8Array> {
  switch (pointer.location) {
    case "stack":
      return Stack.Read.readStack(state.stack, pointer.from, pointer.to);

    case "storage":
      return yield* Storage.Read.readRange(state.storage, pointer.range);

    case "memory":
      return Bytes.Read.readBytes(state.memory, pointer.start, pointer.length);

    case "calldata":
      return Bytes.Read.readBytes(
        state.calldata,
        pointer.start,
        pointer.length
      );

    case "eventdata":
      return Bytes.Read.readBytes(
        state.eventdata,
        pointer.start,
        pointer.length
      );

    case "stackliteral":
      //nothing to do, just return it
      return pointer.literal;

    case "definition":
      return Ast.Read.readDefinition(pointer.definition);

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

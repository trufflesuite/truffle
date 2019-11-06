import * as Storage from "@truffle/codec/storage";
import * as Stack from "@truffle/codec/stack";
import * as Bytes from "@truffle/codec/bytes";
import * as Ast from "@truffle/codec/ast";
import * as Topic from "@truffle/codec/topic";
import * as Special from "@truffle/codec/special";
import * as Pointer from "@truffle/codec/pointer";
import { DecoderRequest } from "@truffle/codec/types";
import * as Evm from "@truffle/codec/evm";

export default function* read(
  pointer: Pointer.DataPointer,
  state: Evm.EvmState
): Generator<DecoderRequest, Uint8Array, Uint8Array> {
  switch (pointer.location) {
    case "stack":
      return Stack.Read.readStack(pointer, state);

    case "storage":
      return yield* Storage.Read.readStorage(pointer, state);

    case "memory":
    case "calldata":
    case "eventdata":
      return Bytes.Read.readBytes(pointer, state);

    case "stackliteral":
      return Stack.Read.readStackLiteral(pointer);

    case "definition":
      return Ast.Read.readDefinition(pointer);

    case "special":
      return Special.Read.readSpecial(pointer, state);

    case "eventtopic":
      return Topic.Read.readTopic(pointer, state);
  }
}

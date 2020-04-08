import * as StorageRead from "@truffle/codec/storage/read";
import * as StackRead from "@truffle/codec/stack/read";
import * as BytesRead from "@truffle/codec/bytes/read";
import * as AstConstantRead from "@truffle/codec/ast-constant/read";
import * as TopicRead from "@truffle/codec/topic/read";
import * as SpecialRead from "@truffle/codec/special/read";
import * as Pointer from "@truffle/codec/pointer";
import { DecoderRequest } from "@truffle/codec/types";
import { DecodingError } from "@truffle/codec/errors";
import * as Evm from "@truffle/codec/evm";

export default function* read(
  pointer: Pointer.DataPointer,
  state: Evm.EvmState
): Generator<DecoderRequest, Uint8Array, Uint8Array> {
  switch (pointer.location) {
    case "stack":
      return StackRead.readStack(pointer, state);

    case "storage":
      return yield* StorageRead.readStorage(pointer, state);

    case "memory":
    case "calldata":
    case "eventdata":
    case "returndata":
      return BytesRead.readBytes(pointer, state);

    case "code":
      //keeping this separate
      return yield* BytesRead.readCode(pointer, state);

    case "stackliteral":
      return StackRead.readStackLiteral(pointer);

    case "definition":
      return AstConstantRead.readDefinition(pointer);

    case "special":
      return SpecialRead.readSpecial(pointer, state);

    case "eventtopic":
      return TopicRead.readTopic(pointer, state);

    case "nowhere":
      throw new DecodingError({
        kind: "UnusedImmutableError" as const
      });
  }
}

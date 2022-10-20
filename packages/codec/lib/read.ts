import * as StorageRead from "./storage/read";
import * as StackRead from "./stack/read";
import * as BytesRead from "./bytes/read";
import * as AstConstantRead from "./ast-constant/read";
import * as TopicRead from "./topic/read";
import * as SpecialRead from "./special/read";
import * as Pointer from "./pointer";
import type { DecoderRequest } from "./types";
import { DecodingError } from "./errors";
import * as Evm from "./evm";

export default function* read(
  pointer: Pointer.DataPointer,
  state: Evm.EvmState
): Generator<DecoderRequest, Uint8Array, Uint8Array | null> {
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

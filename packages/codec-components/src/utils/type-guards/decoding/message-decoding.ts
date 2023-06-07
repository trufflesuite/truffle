import type { MessageDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isMessageDecoding, messageDecodingKinds] =
  decodingTypeGuardHelper<MessageDecoding>("message");

import type { UnknownCallDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isUnknownCallDecoding, unknownCallDecodingKinds] =
  decodingTypeGuardHelper<UnknownCallDecoding>("unknown");

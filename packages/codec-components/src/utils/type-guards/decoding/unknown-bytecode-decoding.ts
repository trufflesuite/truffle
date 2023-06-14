import type { UnknownBytecodeDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isUnknownBytecodeDecoding, unknownBytecodeDecodingKinds] =
  decodingTypeGuardHelper<UnknownBytecodeDecoding>("unknownbytecode");

import type { EmptyFailureDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isEmptyFailureDecoding, emptyFailureDecodingKinds] =
  decodingTypeGuardHelper<EmptyFailureDecoding>("failure");

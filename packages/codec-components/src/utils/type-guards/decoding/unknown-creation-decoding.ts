import type { UnknownCreationDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isUnknownCreationDecoding, unknownCreationDecodingKinds] =
  decodingTypeGuardHelper<UnknownCreationDecoding>("create");

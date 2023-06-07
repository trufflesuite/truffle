import type { ReturnDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isReturnDecoding, returnDecodingKinds] =
  decodingTypeGuardHelper<ReturnDecoding>("return");

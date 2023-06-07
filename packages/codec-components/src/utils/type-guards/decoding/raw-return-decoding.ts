import type { RawReturnDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isRawReturnDecoding, rawReturnDecodingKinds] =
  decodingTypeGuardHelper<RawReturnDecoding>("returnmessage");

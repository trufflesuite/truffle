import type { SelfDestructDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isSelfDestructDecoding, selfDestructDecodingKinds] =
  decodingTypeGuardHelper<SelfDestructDecoding>("selfdestruct");

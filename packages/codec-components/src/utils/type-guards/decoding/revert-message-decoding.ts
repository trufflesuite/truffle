import type { RevertMessageDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isRevertMessageDecoding, revertMessageDecodingKinds] =
  decodingTypeGuardHelper<RevertMessageDecoding>("revert");

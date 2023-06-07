import type { FunctionDecoding } from "@truffle/codec";
import { decodingTypeGuardHelper } from "./helper";

export const [isFunctionDecoding, functionDecodingKinds] =
  decodingTypeGuardHelper<FunctionDecoding>("function");

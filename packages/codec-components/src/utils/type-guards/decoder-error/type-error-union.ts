import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isTypeErrorUnion, typeErrorUnionKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.TypeErrorUnion>();

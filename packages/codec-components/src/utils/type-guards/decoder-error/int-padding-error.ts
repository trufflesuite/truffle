import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isIntPaddingError, intPaddingErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.IntPaddingError>("IntPaddingError");

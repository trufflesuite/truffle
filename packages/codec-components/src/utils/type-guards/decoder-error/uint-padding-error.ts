import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isUintPaddingError, uintPaddingErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.UintPaddingError>(
    "UintPaddingError"
  );

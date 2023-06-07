import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isBoolPaddingError, boolPaddingErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.BoolPaddingError>(
    "BoolPaddingError"
  );

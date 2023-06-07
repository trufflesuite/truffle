import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isFixedPaddingError, fixedPaddingErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.FixedPaddingError>(
    "FixedPaddingError"
  );

import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isUfixedPaddingError, ufixedPaddingErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.UfixedPaddingError>(
    "UfixedPaddingError"
  );

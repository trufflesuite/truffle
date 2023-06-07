import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isUnsupportedConstantError, unsupportedConstantErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.UnsupportedConstantError>(
    "UnsupportedConstantError"
  );

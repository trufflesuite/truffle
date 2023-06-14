import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isEnumPaddingError, enumPaddingErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.EnumPaddingError>(
    "EnumPaddingError"
  );

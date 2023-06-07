import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isEnumNotFoundDecodingError, enumNotFoundDecodingErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.EnumNotFoundDecodingError>(
    "EnumNotFoundDecodingError"
  );

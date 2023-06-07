import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { enumOutOfRangeErrorKinds } from "./enum-out-of-range-error";
import { enumPaddingErrorKinds } from "./enum-padding-error";
import { enumNotFoundDecodingErrorKinds } from "./enum-not-found-decoding-error";

export const [isEnumError, EnumErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.EnumError>(
    ...enumOutOfRangeErrorKinds,
    ...enumPaddingErrorKinds,
    ...enumNotFoundDecodingErrorKinds
  );

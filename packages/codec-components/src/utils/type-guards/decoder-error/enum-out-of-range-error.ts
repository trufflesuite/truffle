import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isEnumOutOfRangeError, enumOutOfRangeErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.EnumOutOfRangeError>(
    "EnumOutOfRangeError"
  );

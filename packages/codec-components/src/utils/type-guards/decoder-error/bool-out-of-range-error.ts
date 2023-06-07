import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isBoolOutOfRangeError, boolOutOfRangeErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.BoolOutOfRangeError>(
    "BoolOutOfRangeError"
  );

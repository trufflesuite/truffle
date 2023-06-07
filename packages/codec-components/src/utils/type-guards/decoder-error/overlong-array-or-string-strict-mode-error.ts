import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [
  isOverlongArrayOrStringStrictModeError,
  overlongArrayOrStringStrictModeErrorKinds
] =
  decoderErrorTypeGuardHelper<Format.Errors.OverlongArrayOrStringStrictModeError>(
    "OverlongArrayOrStringStrictModeError"
  );

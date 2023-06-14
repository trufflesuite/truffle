import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [
  isOverlongArraysAndStringsNotImplementedError,
  overlongArraysAndStringsNotImplementedErrorKinds
] =
  decoderErrorTypeGuardHelper<Format.Errors.OverlongArraysAndStringsNotImplementedError>(
    "OverlongArraysAndStringsNotImplementedError"
  );

import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [
  isOverlargePointersNotImplementedError,
  overlargePointersNotImplementedErrorKinds
] =
  decoderErrorTypeGuardHelper<Format.Errors.OverlargePointersNotImplementedError>(
    "OverlargePointersNotImplementedError"
  );

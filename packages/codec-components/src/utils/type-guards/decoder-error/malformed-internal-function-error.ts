import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [
  isMalformedInternalFunctionError,
  malformedInternalFunctionErrorKinds
] = decoderErrorTypeGuardHelper<Format.Errors.MalformedInternalFunctionError>(
  "MalformedInternalFunctionError"
);

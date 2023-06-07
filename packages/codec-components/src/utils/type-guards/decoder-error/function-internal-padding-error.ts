import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [
  isFunctionInternalPaddingError,
  functionInternalPaddingErrorKinds
] = decoderErrorTypeGuardHelper<Format.Errors.FunctionInternalPaddingError>(
  "FunctionInternalPaddingError"
);

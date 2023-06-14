import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [
  isFunctionExternalNonStackPaddingError,
  functionExternalNonStackPaddingErrorKinds
] =
  decoderErrorTypeGuardHelper<Format.Errors.FunctionExternalNonStackPaddingError>(
    "FunctionExternalNonStackPaddingError"
  );

import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [
  isFunctionExternalStackPaddingError,
  functionExternalStackPaddingErrorKinds
] =
  decoderErrorTypeGuardHelper<Format.Errors.FunctionExternalStackPaddingError>(
    "FunctionExternalStackPaddingError"
  );

import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { functionExternalNonStackPaddingErrorKinds } from "./function-external-non-stack-padding-error";
import { functionExternalStackPaddingErrorKinds } from "./function-external-stack-padding-error";

export const [isFunctionExternalError, functionExternalErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.FunctionExternalError>(
    ...functionExternalNonStackPaddingErrorKinds,
    ...functionExternalStackPaddingErrorKinds
  );

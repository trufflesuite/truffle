import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { functionInternalPaddingErrorKinds } from "./function-internal-padding-error";
import { noSuchInternalFunctionErrorKinds } from "./no-such-internal-function-error";
import { deployedFunctionInConstructorErrorKinds } from "./deployed-function-in-constructor-error";
import { malformedInternalFunctionErrorKinds } from "./malformed-internal-function-error";

export const [isFunctionInternalError, functionInternalErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.FunctionInternalError>(
    ...functionInternalPaddingErrorKinds,
    ...noSuchInternalFunctionErrorKinds,
    ...deployedFunctionInConstructorErrorKinds,
    ...malformedInternalFunctionErrorKinds
  );

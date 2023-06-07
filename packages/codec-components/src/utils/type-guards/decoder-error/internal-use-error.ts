import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { overlongArrayOrStringStrictModeErrorKinds } from "./overlong-array-or-string-strict-mode-error";
import { internalFunctionInABIErrorKinds } from "./internal-function-in-abi-error";

export const [isInternalUseError, internalUseErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.InternalUseError>(
    ...overlongArrayOrStringStrictModeErrorKinds,
    ...internalFunctionInABIErrorKinds
  );

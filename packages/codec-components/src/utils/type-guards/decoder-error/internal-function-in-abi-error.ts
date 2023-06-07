import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isInternalFunctionInABIError, internalFunctionInABIErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.InternalFunctionInABIError>(
    "InternalFunctionInABIError"
  );

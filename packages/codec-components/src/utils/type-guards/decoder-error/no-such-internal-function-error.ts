import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isNoSuchInternalFunctionError, noSuchInternalFunctionErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.NoSuchInternalFunctionError>(
    "NoSuchInternalFunctionError"
  );

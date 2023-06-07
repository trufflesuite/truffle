import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { wrappedErrorKinds } from "./wrapped-error";

export const [isUserDefinedValueTypeError, userDefinedValueTypeErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.UserDefinedValueTypeError>(
    ...wrappedErrorKinds
  );

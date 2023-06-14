import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { userDefinedTypeNotFoundErrorKinds } from "./user-defined-type-not-found-error";
import { readErrorKinds } from "./read-error";

export const [isErrorForThrowing, errorForThrowingKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.ErrorForThrowing>(
    ...userDefinedTypeNotFoundErrorKinds,
    ...readErrorKinds
  );

import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { userDefinedTypeNotFoundErrorKinds } from "./user-defined-type-not-found-error";
import { indexedReferenceTypeErrorKinds } from "./indexed-reference-type-error";
import { readErrorKinds } from "./read-error";

export const [isGenericError, genericErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.GenericError>(
    ...userDefinedTypeNotFoundErrorKinds,
    ...indexedReferenceTypeErrorKinds,
    ...readErrorKinds
  );

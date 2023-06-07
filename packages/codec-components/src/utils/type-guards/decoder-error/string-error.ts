import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { dynamicDataImplementationErrorKinds } from "./dynamic-data-implementation-error";

export const [isStringError, stringErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.StringError>(
    ...dynamicDataImplementationErrorKinds
  );

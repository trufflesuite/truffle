import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { dynamicDataImplementationErrorKinds } from "./dynamic-data-implementation-error";

export const [isStructError, structErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.StructError>(
    ...dynamicDataImplementationErrorKinds
  );

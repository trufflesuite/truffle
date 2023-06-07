import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { dynamicDataImplementationErrorKinds } from "./dynamic-data-implementation-error";

export const [isBytesDynamicError, bytesDynamicErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.BytesDynamicError>(
    ...dynamicDataImplementationErrorKinds
  );

import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isBytesPaddingError, bytesPaddingErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.BytesPaddingError>(
    "BytesPaddingError"
  );

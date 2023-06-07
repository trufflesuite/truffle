import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { bytesPaddingErrorKinds } from "./bytes-padding-error";

export const [isBytesStaticError, bytesStaticErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.BytesStaticError>(
    ...bytesPaddingErrorKinds
  );

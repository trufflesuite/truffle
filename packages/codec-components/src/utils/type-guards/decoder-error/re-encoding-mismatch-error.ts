import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isReEncodingMismatchError, reEncodingMismatchErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.ReEncodingMismatchError>(
    "ReEncodingMismatchError"
  );

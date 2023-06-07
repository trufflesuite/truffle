import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { uintPaddingErrorKinds } from "./uint-padding-error";

export const [isUintError, uintErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.UintError>(
    ...uintPaddingErrorKinds
  );

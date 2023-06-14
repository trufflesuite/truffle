import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { fixedPaddingErrorKinds } from "./fixed-padding-error";

export const [isFixedError, fixedErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.FixedError>(
    ...fixedPaddingErrorKinds
  );

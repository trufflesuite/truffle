import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { ufixedPaddingErrorKinds } from "./ufixed-padding-error";

export const [isUfixedError, ufixedErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.UfixedError>(
    ...ufixedPaddingErrorKinds
  );

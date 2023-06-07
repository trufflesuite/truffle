import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isUnusedImmutableError, unusedImmutableErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.UnusedImmutableError>(
    "UnusedImmutableError"
  );

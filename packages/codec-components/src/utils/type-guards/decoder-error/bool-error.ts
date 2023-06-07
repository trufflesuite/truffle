import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { boolOutOfRangeErrorKinds } from "./bool-out-of-range-error";
import { boolPaddingErrorKinds } from "./bool-padding-error";

export const [isBoolError, boolErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.BoolError>(
    ...boolOutOfRangeErrorKinds,
    ...boolPaddingErrorKinds
  );

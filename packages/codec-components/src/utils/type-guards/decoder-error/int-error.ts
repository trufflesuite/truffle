import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { intPaddingErrorKinds } from "./int-padding-error";

export const [isIntError, intErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.IntError>(...intPaddingErrorKinds);

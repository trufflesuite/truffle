import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isWrappedError, wrappedErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.WrappedError>("WrappedError");

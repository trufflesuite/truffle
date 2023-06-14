import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isMagicError, magicErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.MagicError>();

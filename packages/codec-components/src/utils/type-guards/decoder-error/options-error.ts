import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isOptionsError, optionsErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.OptionsError>();

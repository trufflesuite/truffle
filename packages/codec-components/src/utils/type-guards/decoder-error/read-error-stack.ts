import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isReadErrorStack, readErrorStackKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.ReadErrorStack>("ReadErrorStack");

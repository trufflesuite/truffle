import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isReadErrorBytes, readErrorBytesKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.ReadErrorBytes>("ReadErrorBytes");

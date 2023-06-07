import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isMappingError, mappingErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.MappingError>();

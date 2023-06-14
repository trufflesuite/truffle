import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isIndexedReferenceTypeError, indexedReferenceTypeErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.IndexedReferenceTypeError>(
    "IndexedReferenceTypeError"
  );

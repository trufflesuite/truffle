import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isStorageNotSuppliedError, storageNotSuppliedErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.StorageNotSuppliedError>(
    "StorageNotSuppliedError"
  );

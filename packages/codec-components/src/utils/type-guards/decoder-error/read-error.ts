import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { unsupportedConstantErrorKinds } from "./unsupported-constant-error";
import { readErrorStackKinds } from "./read-error-stack";
import { readErrorBytesKinds } from "./read-error-bytes";
import { readErrorStorageKinds } from "./read-error-storage";
import { storageNotSuppliedErrorKinds } from "./storage-not-supplied-error";
import { unusedImmutableErrorKinds } from "./unused-immutable-error";
import { codeNotSuppliedErrorKinds } from "./code-not-supplied-error";

export const [isReadError, readErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.ReadError>(
    ...unsupportedConstantErrorKinds,
    ...readErrorStackKinds,
    ...readErrorBytesKinds,
    ...readErrorStorageKinds,
    ...storageNotSuppliedErrorKinds,
    ...unusedImmutableErrorKinds,
    ...codeNotSuppliedErrorKinds
  );

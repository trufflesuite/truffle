import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { overlongArraysAndStringsNotImplementedErrorKinds } from "./overlong-arrays-and-strings-not-implemented-error";
import { overlargePointersNotImplementedErrorKinds } from "./overlarge-pointers-not-implemented-error";

export const [
  isDynamicDataImplementationError,
  dynamicDataImplementationErrorKinds
] = decoderErrorTypeGuardHelper<Format.Errors.DynamicDataImplementationError>(
  ...overlongArraysAndStringsNotImplementedErrorKinds,
  ...overlargePointersNotImplementedErrorKinds
);

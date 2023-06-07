import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [
  isUserDefinedTypeNotFoundError,
  userDefinedTypeNotFoundErrorKinds
] = decoderErrorTypeGuardHelper<Format.Errors.UserDefinedTypeNotFoundError>(
  "UserDefinedTypeNotFoundError"
);

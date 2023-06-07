import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isCodeNotSuppliedError, codeNotSuppliedErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.CodeNotSuppliedError>(
    "CodeNotSuppliedError"
  );

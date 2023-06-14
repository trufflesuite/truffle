import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [isContractPaddingError, contractPaddingErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.ContractPaddingError>(
    "ContractPaddingError"
  );

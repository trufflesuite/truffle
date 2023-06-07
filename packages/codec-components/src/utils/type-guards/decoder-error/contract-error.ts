import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";
import { contractPaddingErrorKinds } from "./contract-padding-error";

export const [isContractError, contractErrorKinds] =
  decoderErrorTypeGuardHelper<Format.Errors.ContractError>(
    ...contractPaddingErrorKinds
  );

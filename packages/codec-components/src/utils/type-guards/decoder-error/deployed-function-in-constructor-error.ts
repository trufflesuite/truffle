import type { Format } from "@truffle/codec";
import { decoderErrorTypeGuardHelper } from "./helper";

export const [
  isDeployedFunctionInConstructorError,
  deployedFunctionInConstructorErrorKinds
] =
  decoderErrorTypeGuardHelper<Format.Errors.DeployedFunctionInConstructorError>(
    "DeployedFunctionInConstructorError"
  );

import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [
  isContractValue,
  isContractErrorResult,
  isContractResult,
  contractGuards
] = valueAndResultTypeGuardHelper<
  Format.Values.ContractValue,
  Format.Errors.ContractErrorResult,
  Format.Values.ContractResult
>(data => data.type.typeClass === "contract");

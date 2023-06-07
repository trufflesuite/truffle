import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [
  isFunctionExternalValue,
  isFunctionExternalErrorResult,
  isFunctionExternalResult,
  functionExternalGuards
] = valueAndResultTypeGuardHelper<
  Format.Values.FunctionExternalValue,
  Format.Errors.FunctionExternalErrorResult,
  Format.Values.FunctionExternalResult
>(
  data =>
    data.type.typeClass === "function" && data.type.visibility === "external"
);

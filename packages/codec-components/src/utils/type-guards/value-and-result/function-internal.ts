import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [
  isFunctionInternalValue,
  isFunctionInternalErrorResult,
  isFunctionInternalResult,
  functionInternalGuards
] = valueAndResultTypeGuardHelper<
  Format.Values.FunctionInternalValue,
  Format.Errors.FunctionInternalErrorResult,
  Format.Values.FunctionInternalResult
>(
  data =>
    data.type.typeClass === "function" && data.type.visibility === "internal"
);

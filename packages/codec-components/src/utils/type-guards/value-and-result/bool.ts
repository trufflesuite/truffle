import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [isBoolValue, isBoolErrorResult, isBoolResult, boolGuards] =
  valueAndResultTypeGuardHelper<
    Format.Values.BoolValue,
    Format.Errors.BoolErrorResult,
    Format.Values.BoolResult
  >(data => data.type.typeClass === "bool");

import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [isUintValue, isUintErrorResult, isUintResult, uintGuards] =
  valueAndResultTypeGuardHelper<
    Format.Values.UintValue,
    Format.Errors.UintErrorResult,
    Format.Values.UintResult
  >(data => data.type.typeClass === "uint");

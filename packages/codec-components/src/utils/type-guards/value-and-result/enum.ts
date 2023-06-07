import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [isEnumValue, isEnumErrorResult, isEnumResult, enumGuards] =
  valueAndResultTypeGuardHelper<
    Format.Values.EnumValue,
    Format.Errors.EnumErrorResult,
    Format.Values.EnumResult
  >(data => data.type.typeClass === "enum");

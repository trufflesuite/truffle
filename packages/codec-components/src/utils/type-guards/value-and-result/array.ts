import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [isArrayValue, isArrayErrorResult, isArrayResult, arrayGuards] =
  valueAndResultTypeGuardHelper<
    Format.Values.ArrayValue,
    Format.Errors.ArrayErrorResult,
    Format.Values.ArrayResult
  >(data => data.type.typeClass === "array");

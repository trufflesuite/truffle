import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [isIntValue, isIntErrorResult, isIntResult, intGuards] =
  valueAndResultTypeGuardHelper<
    Format.Values.IntValue,
    Format.Errors.IntErrorResult,
    Format.Values.IntResult
  >(data => data.type.typeClass === "int");

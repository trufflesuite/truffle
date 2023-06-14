import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [isFixedValue, isFixedErrorResult, isFixedResult, fixedGuards] =
  valueAndResultTypeGuardHelper<
    Format.Values.FixedValue,
    Format.Errors.FixedErrorResult,
    Format.Values.FixedResult
  >(data => data.type.typeClass === "fixed");

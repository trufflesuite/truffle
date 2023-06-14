import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [isTypeValue, isTypeErrorResult, isTypeResult, typeGuards] =
  valueAndResultTypeGuardHelper<
    Format.Values.TypeValue,
    Format.Errors.TypeErrorResult,
    Format.Values.TypeResult
  >(data => data.type.typeClass === "type");

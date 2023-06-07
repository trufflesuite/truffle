import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [
  isUfixedValue,
  isUfixedErrorResult,
  isUfixedResult,
  ufixedGuards
] = valueAndResultTypeGuardHelper<
  Format.Values.UfixedValue,
  Format.Errors.UfixedErrorResult,
  Format.Values.UfixedResult
>(data => data.type.typeClass === "ufixed");

import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [
  isUserDefinedValueTypeValue,
  isUserDefinedValueTypeErrorResult,
  isUserDefinedValueTypeResult,
  userDefinedValueTypeGuards
] = valueAndResultTypeGuardHelper<
  Format.Values.UserDefinedValueTypeValue,
  Format.Errors.UserDefinedValueTypeErrorResult,
  Format.Values.UserDefinedValueTypeResult
>(data => data.type.typeClass === "userDefinedValueType");

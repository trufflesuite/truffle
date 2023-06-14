import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [
  isStringValue,
  isStringErrorResult,
  isStringResult,
  stringGuards
] = valueAndResultTypeGuardHelper<
  Format.Values.StringValue,
  Format.Errors.StringErrorResult,
  Format.Values.StringResult
>(data => data.type.typeClass === "string");

import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [
  isOptionsValue,
  isOptionsErrorResult,
  isOptionsResult,
  optionsGuards
] = valueAndResultTypeGuardHelper<
  Format.Values.OptionsValue,
  Format.Errors.OptionsErrorResult,
  Format.Values.OptionsResult
>(data => data.type.typeClass === "options");

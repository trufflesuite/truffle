import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [
  isMappingValue,
  isMappingErrorResult,
  isMappingResult,
  mappingGuards
] = valueAndResultTypeGuardHelper<
  Format.Values.MappingValue,
  Format.Errors.MappingErrorResult,
  Format.Values.MappingResult
>(data => data.type.typeClass === "mapping");

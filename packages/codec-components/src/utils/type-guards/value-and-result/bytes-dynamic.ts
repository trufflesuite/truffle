import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [
  isBytesDynamicValue,
  isBytesDynamicErrorResult,
  isBytesDynamicResult,
  bytesDynamicGuards
] = valueAndResultTypeGuardHelper<
  Format.Values.BytesDynamicValue,
  Format.Errors.BytesDynamicErrorResult,
  Format.Values.BytesDynamicResult
>(data => data.type.typeClass === "bytes" && data.type.kind === "dynamic");

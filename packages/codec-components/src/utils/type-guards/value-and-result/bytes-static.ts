import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [
  isBytesStaticValue,
  isBytesStaticErrorResult,
  isBytesStaticResult,
  bytesStaticGuards
] = valueAndResultTypeGuardHelper<
  Format.Values.BytesStaticValue,
  Format.Errors.BytesStaticErrorResult,
  Format.Values.BytesStaticResult
>(data => data.type.typeClass === "bytes" && data.type.kind === "static");

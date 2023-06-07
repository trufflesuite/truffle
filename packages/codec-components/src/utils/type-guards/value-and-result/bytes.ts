import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [isBytesValue, isBytesErrorResult, isBytesResult, bytesGuards] =
  valueAndResultTypeGuardHelper<
    Format.Values.BytesValue,
    Format.Errors.BytesErrorResult,
    Format.Values.BytesResult
  >(data => data.type.typeClass === "bytes");

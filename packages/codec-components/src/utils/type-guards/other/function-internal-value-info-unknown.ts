import type { Format } from "@truffle/codec";

export const isFunctionInternalValueInfoUnknown = (
  data: Format.Values.FunctionInternalValueInfo
): data is Format.Values.FunctionInternalValueInfoUnknown =>
  data.kind === "unknown";

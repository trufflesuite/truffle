import type { Format } from "@truffle/codec";

export const isFunctionInternalValueInfoKnown = (
  data: Format.Values.FunctionInternalValueInfo
): data is Format.Values.FunctionInternalValueInfoKnown =>
  data.kind === "function";

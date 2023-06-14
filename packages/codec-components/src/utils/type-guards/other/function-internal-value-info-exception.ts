import type { Format } from "@truffle/codec";

export const isFunctionInternalValueInfoException = (
  data: Format.Values.FunctionInternalValueInfo
): data is Format.Values.FunctionInternalValueInfoException =>
  data.kind === "exception";

import type { Format } from "@truffle/codec";

export const isFunctionInternalRawInfoIndex = (
  data: Format.Values.FunctionInternalRawInfo
): data is Format.Values.FunctionInternalRawInfoIndex => data.kind === "index";

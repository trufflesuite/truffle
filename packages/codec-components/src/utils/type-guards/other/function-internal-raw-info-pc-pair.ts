import type { Format } from "@truffle/codec";

export const isFunctionInternalRawInfoPcPair = (
  data: Format.Values.FunctionInternalRawInfo
): data is Format.Values.FunctionInternalRawInfoPcPair =>
  data.kind === "pcpair";

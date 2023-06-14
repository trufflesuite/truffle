import type { Format } from "@truffle/codec";

export const isFunctionExternalValueInfoKnown = (
  data: Format.Values.FunctionExternalValueInfo
): data is Format.Values.FunctionExternalValueInfoKnown =>
  data.kind === "known";

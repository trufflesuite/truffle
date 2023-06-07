import type { Format } from "@truffle/codec";

export const isFunctionExternalValueInfoInvalid = (
  data: Format.Values.FunctionExternalValueInfo
): data is Format.Values.FunctionExternalValueInfoInvalid =>
  data.kind === "invalid";

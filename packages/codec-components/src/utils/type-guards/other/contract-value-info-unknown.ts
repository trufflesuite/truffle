import type { Format } from "@truffle/codec";

export const isContractValueInfoUnknown = (
  data: Format.Values.ContractValueInfo
): data is Format.Values.ContractValueInfoUnknown => data.kind === "unknown";

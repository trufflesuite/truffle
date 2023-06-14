import type { DecodingMode } from "@truffle/codec";

export default {
  full: "full",
  abi: "abi"
} satisfies Record<string, DecodingMode>;

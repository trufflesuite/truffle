import type { Format } from "@truffle/codec";

export default {
  uint8: { bits: 8, typeClass: "uint" },
  uint256: { bits: 256, typeClass: "uint", typeHint: "uint256" }
} satisfies Record<string, Format.Types.UintType>;

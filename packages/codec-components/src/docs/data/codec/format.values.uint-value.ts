import type { Format } from "@truffle/codec";
import BN from "bn.js";

export default {
  uint8: {
    kind: "value",
    type: { bits: 8, typeClass: "uint" },
    value: { asBN: new BN("ff", 16) },
    interpretations: {}
  },
  uint256: {
    kind: "value",
    type: { bits: 256, typeClass: "uint", typeHint: "uint256" },
    value: { asBN: new BN("ffffffff", 16) },
    interpretations: {}
  }
} satisfies Record<string, Format.Values.UintValue>;

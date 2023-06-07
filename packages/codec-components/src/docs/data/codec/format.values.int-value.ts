import type { Format } from "@truffle/codec";
import BN from "bn.js";

export default {
  int256: {
    kind: "value",
    type: { bits: 256, typeClass: "int" },
    value: { asBN: new BN(92458120) },
    interpretations: {}
  }
} satisfies Record<string, Format.Values.IntValue>;

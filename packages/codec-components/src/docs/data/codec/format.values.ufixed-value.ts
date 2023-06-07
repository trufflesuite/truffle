import type { Format } from "@truffle/codec";
import Big from "big.js";

export default {
  ufixed128x18: {
    kind: "value",
    type: { bits: 128, places: 18, typeClass: "ufixed" },
    value: { asBig: new Big(10000) },
    interpretations: {}
  }
} satisfies Record<string, Format.Values.UfixedValue>;

import type { ReturnDecoding } from "@truffle/codec";
import BN from "bn.js";

export default {
  oneValue: {
    arguments: [
      {
        value: {
          kind: "value",
          type: { kind: "general", typeClass: "address" },
          interpretations: {},
          value: { asAddress: `0x${"1".repeat(40)}` }
        }
      }
    ],
    decodingMode: "full",
    interpretations: {},
    kind: "return",
    status: true
  },
  multipleValues: {
    arguments: [
      {
        value: {
          kind: "value",
          type: { bits: 64, typeClass: "uint" },
          interpretations: {},
          value: { asBN: new BN("abcdef", 16) }
        }
      },
      {
        value: {
          kind: "value",
          type: { typeClass: "bool", typeHint: "bool" },
          interpretations: {},
          value: { asBoolean: false }
        }
      }
    ],
    decodingMode: "full",
    interpretations: {},
    kind: "return",
    status: true
  }
} satisfies Record<string, ReturnDecoding>;

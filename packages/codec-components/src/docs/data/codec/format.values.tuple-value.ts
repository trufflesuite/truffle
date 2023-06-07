import type { Format } from "@truffle/codec";
import BN from "bn.js";

export default {
  empty: {
    kind: "value",
    type: { typeClass: "tuple", memberTypes: [] },
    interpretations: {},
    value: []
  },
  notEmpty: {
    kind: "value",
    type: { typeClass: "tuple", memberTypes: [] },
    interpretations: {},
    value: [
      {
        name: "destination",
        value: {
          kind: "value",
          type: { kind: "specific", typeClass: "address", payable: true },
          interpretations: {},
          value: { asAddress: `0x${"0".repeat(40)}` }
        }
      },
      {
        value: {
          kind: "value",
          type: {
            typeClass: "array",
            baseType: { typeClass: "uint", bits: 256 },
            kind: "dynamic"
          },
          interpretations: {},
          value: [
            {
              type: { typeClass: "uint", bits: 256 },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN("100000", 16) }
            },
            {
              type: { typeClass: "uint", bits: 256 },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN("200000", 16) }
            },
            {
              type: { typeClass: "uint", bits: 256 },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN("300000", 16) }
            },
            {
              type: { typeClass: "uint", bits: 256 },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN("400000", 16) }
            }
          ]
        }
      }
    ]
  }
} satisfies Record<string, Format.Values.TupleValue>;

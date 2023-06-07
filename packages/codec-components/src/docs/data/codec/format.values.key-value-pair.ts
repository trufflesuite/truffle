import type { Format } from "@truffle/codec";
import BN from "bn.js";

export default {
  addressToUint: {
    key: {
      kind: "value",
      type: { kind: "specific", typeClass: "address", payable: true },
      interpretations: {},
      value: { asAddress: "0xE5e955BC4b61A721b0CD78550914D75d754baC23" }
    },
    value: {
      kind: "value",
      type: { bits: 256, typeClass: "uint" },
      interpretations: {},
      value: { asBN: new BN(1200) }
    }
  },
  addressToBoolArray: {
    key: {
      kind: "value",
      type: { kind: "specific", typeClass: "address", payable: true },
      interpretations: {},
      value: { asAddress: "0xa4C8C08b59eaA2a8ec9BAD3cF97625da12E423c6" }
    },
    value: {
      kind: "value",
      type: {
        typeClass: "array",
        baseType: { typeClass: "bool" },
        kind: "dynamic",
        typeHint: "bool[]"
      },
      interpretations: {},
      value: [
        {
          type: { typeClass: "bool" },
          kind: "value",
          interpretations: {},
          value: { asBoolean: true }
        },
        {
          type: { typeClass: "bool" },
          kind: "value",
          interpretations: {},
          value: { asBoolean: false }
        },
        {
          type: { typeClass: "bool" },
          kind: "value",
          interpretations: {},
          value: { asBoolean: true }
        }
      ]
    }
  }
} satisfies Record<string, Format.Values.KeyValuePair>;

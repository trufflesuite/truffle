import type { Format } from "@truffle/codec";

export default {
  withName: {
    name: "someName",
    value: {
      kind: "value",
      type: { kind: "specific", typeClass: "address", payable: true },
      interpretations: {},
      value: { asAddress: "0x72707C1D14afda33FB5A48F0a5553764FE361c9F" }
    }
  },
  withoutName: {
    value: {
      kind: "value",
      type: { kind: "specific", typeClass: "address", payable: true },
      interpretations: {},
      value: { asAddress: "0x99a0550af0F84b08DBf87139d1a4DA3cB805a4D5" }
    }
  }
} satisfies Record<string, Format.Values.OptionallyNamedValue>;

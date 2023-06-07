import type { Format } from "@truffle/codec";

export default {
  true: {
    kind: "value",
    type: { typeClass: "bool", typeHint: "bool" },
    value: { asBoolean: true },
    interpretations: {}
  },
  false: {
    kind: "value",
    type: { typeClass: "bool", typeHint: "bool" },
    value: { asBoolean: false },
    interpretations: {}
  }
} satisfies Record<string, Format.Values.BoolValue>;

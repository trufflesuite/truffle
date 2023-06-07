import type { Format } from "@truffle/codec";

export default {
  valid: {
    kind: "value",
    type: { typeClass: "string" },
    value: { kind: "valid", asString: "This is a valid string." },
    interpretations: {}
  },
  malformed: {
    kind: "value",
    type: { typeClass: "string" },
    value: { kind: "malformed", asHex: "0xaaaaaa" },
    interpretations: {}
  }
} satisfies Record<string, Format.Values.StringValue>;

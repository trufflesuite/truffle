import type { Format } from "@truffle/codec";

export default {
  bytes32: {
    name: "luckyBytes",
    value: {
      kind: "value",
      type: { kind: "static", length: 32, typeClass: "bytes" },
      interpretations: {},
      value: {
        asHex:
          "0xa95171ed6a4eb0d7303c5974c57b7768df146035b478c8b2a20e76d37202baa0"
      }
    }
  }
} satisfies Record<string, Format.Values.NameValuePair>;

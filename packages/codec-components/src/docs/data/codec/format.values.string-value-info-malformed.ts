import type { Format } from "@truffle/codec";

export default {
  fffff: { kind: "malformed", asHex: "0xfffff" }
} satisfies Record<string, Format.Values.StringValueInfoMalformed>;

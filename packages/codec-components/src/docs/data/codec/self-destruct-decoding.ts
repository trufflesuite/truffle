import type { SelfDestructDecoding } from "@truffle/codec";

export default {
  decoding: {
    decodingMode: "full",
    interpretations: {},
    kind: "selfdestruct",
    status: true
  }
} satisfies Record<string, SelfDestructDecoding>;

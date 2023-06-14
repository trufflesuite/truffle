import type { EmptyFailureDecoding } from "@truffle/codec";

export default {
  decoding: {
    decodingMode: "full",
    interpretations: {},
    kind: "failure",
    status: false
  }
} satisfies Record<string, EmptyFailureDecoding>;

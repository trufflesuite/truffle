import type { RevertMessageDecoding } from "@truffle/codec";

export default {
  unauthorized: {
    abi: {
      name: "Unauthorized",
      type: "error",
      inputs: [{ name: "person", type: "string" }]
    },
    arguments: [
      {
        name: "person",
        value: {
          kind: "value",
          type: { typeClass: "string" },
          interpretations: {},
          value: { asString: "Bob", kind: "valid" }
        }
      }
    ],
    decodingMode: "full",
    interpretations: {},
    kind: "revert",
    status: false
  }
} satisfies Record<string, RevertMessageDecoding>;

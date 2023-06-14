import type { AnonymousDecoding } from "@truffle/codec";

export default {
  oneParam: {
    abi: {
      anonymous: true,
      inputs: [
        { indexed: false, internalType: "bool", name: "ok", type: "bool" }
      ],
      name: "EventC",
      type: "event"
    },
    arguments: [
      {
        name: "ok",
        value: {
          kind: "value",
          type: { typeClass: "bool" },
          interpretations: {},
          value: { asBoolean: true }
        }
      }
    ],
    class: {
      id: "1",
      kind: "native",
      typeClass: "contract",
      typeName: "EventTest"
    },
    decodingMode: "full",
    interpretations: {},
    kind: "anonymous"
  }
} satisfies Record<string, AnonymousDecoding>;

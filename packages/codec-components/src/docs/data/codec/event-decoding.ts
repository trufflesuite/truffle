import type { EventDecoding } from "@truffle/codec";
import BN from "bn.js";

export default {
  noParam: {
    abi: {
      anonymous: false,
      inputs: [],
      name: "Ping",
      type: "event"
    },
    arguments: [],
    class: {
      id: "1",
      kind: "native",
      typeClass: "contract",
      typeName: "EventTest"
    },
    decodingMode: "full",
    interpretations: {},
    kind: "event",
    selector: "ca6e822df923f741dfe968d15d80a18abd25bd1e748bcb9ad81fea5bbb7386af"
  },
  oneParam: {
    abi: {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "string",
          name: "message",
          type: "string"
        }
      ],
      name: "EventA",
      type: "event"
    },
    arguments: [
      {
        name: "message",
        value: {
          kind: "value",
          type: { typeClass: "string" },
          interpretations: {},
          value: { asString: "what a message", kind: "valid" }
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
    kind: "event",
    selector: "5e05ac6530ef7a509fe432b9ff8e0cbbda4970161ce1b5d9dcd2da94919f12cd"
  },
  multipleParams: {
    abi: {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "someone",
          type: "address"
        },
        {
          indexed: false,
          internalType: "string",
          name: "something",
          type: "string"
        },
        {
          indexed: false,
          internalType: "int32",
          name: "someNumber",
          type: "int32"
        }
      ],
      name: "EventB",
      type: "event"
    },
    arguments: [
      {
        name: "someone",
        value: {
          kind: "value",
          type: { kind: "specific", typeClass: "address", payable: false },
          interpretations: {},
          value: { asAddress: `0x${"0123456789".repeat(4)}` }
        }
      },
      {
        name: "something",
        value: {
          kind: "value",
          type: { typeClass: "string" },
          interpretations: {},
          value: { asString: "bought a potato for", kind: "valid" }
        }
      },
      {
        name: "someNumber",
        value: {
          kind: "value",
          type: { bits: 32, typeClass: "int" },
          interpretations: {},
          value: { asBN: new BN("a", 16) }
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
    kind: "event",
    selector: "648803c92f5d6abbc05680b0c3e1edbf74a3db4ec1152c213c79c283d469ceea"
  }
} satisfies Record<string, EventDecoding>;

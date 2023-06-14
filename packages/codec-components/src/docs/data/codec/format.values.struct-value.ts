import type { Format } from "@truffle/codec";
import BN from "bn.js";

export default {
  local: {
    kind: "value",
    type: {
      kind: "local",
      id: "0",
      definingContractName: "SwapRouter",
      typeClass: "struct",
      typeName: "SwapCallbackData"
    },
    interpretations: {},
    value: [
      {
        name: "path",
        value: {
          kind: "value",
          type: { kind: "dynamic", typeClass: "bytes" },
          interpretations: {},
          value: { asHex: "0x0123456789" }
        }
      },
      {
        name: "payer",
        value: {
          kind: "value",
          type: { kind: "general", typeClass: "address" },
          interpretations: {},
          value: { asAddress: "0x496d79391446b3826549EA851aC972aF5163A4C8" }
        }
      }
    ]
  },
  global: {
    kind: "value",
    type: {
      kind: "global",
      id: "0",
      typeClass: "struct",
      typeName: "Pet"
    },
    interpretations: {},
    value: [
      {
        name: "species",
        value: {
          kind: "value",
          type: { typeClass: "string" },
          interpretations: {},
          value: { asString: "Goat", kind: "valid" }
        }
      },
      {
        name: "age",
        value: {
          kind: "value",
          type: { bits: 8, typeClass: "uint" },
          interpretations: {},
          value: { asBN: new BN(3) }
        }
      },
      {
        name: "numFriends",
        value: {
          kind: "value",
          type: { bits: 256, typeClass: "uint" },
          interpretations: {},
          value: { asBN: new BN(500) }
        }
      }
    ]
  }
} satisfies Record<string, Format.Values.StructValue>;

import type { Format } from "@truffle/codec";

export default {
  withoutLocation: {
    kind: "value",
    type: { kind: "dynamic", typeClass: "bytes" },
    value: { asHex: "0x0fedcb12" },
    interpretations: {}
  },
  inStorage: {
    kind: "value",
    type: { kind: "dynamic", location: "storage", typeClass: "bytes" },
    value: { asHex: "0x1cd8a68335394db72b851f1f700fd0ebe4a30c81" },
    interpretations: {}
  },
  inMemory: {
    kind: "value",
    type: { kind: "dynamic", location: "memory", typeClass: "bytes" },
    value: {
      asHex:
        "0x0000000000000000000000000000000000000000000000000000000000000000"
    },
    interpretations: {}
  },
  inCalldata: {
    kind: "value",
    type: { kind: "dynamic", location: "calldata", typeClass: "bytes" },
    value: {
      asHex:
        "0xd15b0c1f6cc41cdfa2369e2208ea0b159a0842b1f36d6027ba4d9f41568ab7084ba1847c606c087f14f1a4df63751e0f4e5009ae10d3d6b838658dc348899bfa"
    },
    interpretations: {}
  }
} satisfies Record<string, Format.Values.BytesDynamicValue>;

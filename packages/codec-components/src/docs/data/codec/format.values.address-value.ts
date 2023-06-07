import type { Format } from "@truffle/codec";

export default {
  general: {
    kind: "value",
    type: { kind: "general", typeClass: "address" },
    value: { asAddress: `0x${"5".repeat(40)}` },
    interpretations: {}
  },
  payable: {
    kind: "value",
    type: { kind: "specific", typeClass: "address", payable: true },
    value: { asAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
    interpretations: {}
  },
  nonPayable: {
    kind: "value",
    type: { kind: "specific", typeClass: "address", payable: false },
    value: { asAddress: `0x${"0".repeat(40)}` },
    interpretations: {}
  }
} satisfies Record<string, Format.Values.AddressValue>;

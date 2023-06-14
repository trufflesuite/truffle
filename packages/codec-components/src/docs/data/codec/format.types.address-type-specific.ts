import type { Format } from "@truffle/codec";

export default {
  payable: { kind: "specific", typeClass: "address", payable: true },
  nonPayable: { kind: "specific", typeClass: "address", payable: false }
} satisfies Record<string, Format.Types.AddressTypeSpecific>;

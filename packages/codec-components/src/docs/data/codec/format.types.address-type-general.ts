import type { Format } from "@truffle/codec";

export default {
  type: { kind: "general", typeClass: "address" }
} satisfies Record<string, Format.Types.AddressTypeGeneral>;

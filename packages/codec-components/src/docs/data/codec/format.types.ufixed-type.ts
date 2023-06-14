import type { Format } from "@truffle/codec";

export default {
  ufixed128x18: { bits: 128, places: 18, typeClass: "ufixed" }
} satisfies Record<string, Format.Types.UfixedType>;

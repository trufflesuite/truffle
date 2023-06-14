import type { Format } from "@truffle/codec";

export default {
  fixed128x18: { bits: 128, places: 18, typeClass: "fixed" }
} satisfies Record<string, Format.Types.FixedType>;

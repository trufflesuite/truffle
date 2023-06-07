import type { Format } from "@truffle/codec";

export default {
  int256: { bits: 256, typeClass: "int" }
} satisfies Record<string, Format.Types.IntType>;

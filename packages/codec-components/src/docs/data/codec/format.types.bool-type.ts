import type { Format } from "@truffle/codec";

export default {
  type: { typeClass: "bool", typeHint: "bool" }
} satisfies Record<string, Format.Types.BoolType>;

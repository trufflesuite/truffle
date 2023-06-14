import type { Format } from "@truffle/codec";

export default {
  someString: { kind: "valid", asString: "some string" }
} satisfies Record<string, Format.Values.StringValueInfoValid>;

import type { AbiArgument } from "@truffle/codec";

export default {
  withParamName: {
    name: "someParam",
    value: {
      kind: "value",
      type: { typeClass: "string" },
      interpretations: {},
      value: { asString: "someArg", kind: "valid" }
    }
  },
  withoutParamName: {
    value: {
      kind: "value",
      type: { typeClass: "bool", typeHint: "bool" },
      interpretations: {},
      value: { asBoolean: true }
    }
  }
} satisfies Record<string, AbiArgument>;

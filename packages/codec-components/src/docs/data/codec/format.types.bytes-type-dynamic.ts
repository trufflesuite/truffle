import type { Format } from "@truffle/codec";

export default {
  withoutLocation: { kind: "dynamic", typeClass: "bytes" },
  inStorage: { kind: "dynamic", location: "storage", typeClass: "bytes" },
  inMemory: { kind: "dynamic", location: "memory", typeClass: "bytes" },
  inCalldata: { kind: "dynamic", location: "calldata", typeClass: "bytes" }
} satisfies Record<string, Format.Types.BytesTypeDynamic>;

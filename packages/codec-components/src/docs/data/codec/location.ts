import type { Location } from "@truffle/codec";

export default {
  storage: "storage",
  memory: "memory",
  calldata: "calldata"
} satisfies Record<string, Location>;

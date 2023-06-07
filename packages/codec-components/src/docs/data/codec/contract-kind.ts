import type { ContractKind } from "@truffle/codec";

export default {
  contract: "contract",
  library: "library",
  interface: "interface"
} satisfies Record<string, ContractKind>;

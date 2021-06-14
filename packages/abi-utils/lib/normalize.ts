import type { Abi as SchemaAbi } from "@truffle/contract-schema/spec";
import type { Abi, Entry, StateMutability } from "./types";

export const normalize = (looseAbi: SchemaAbi | Abi): Abi =>
  (looseAbi as SchemaAbi).map(normalizeEntry);

type Item<A> = A extends (infer I)[] ? I : never;

export const normalizeEntry = (looseEntry: Item<SchemaAbi> | Entry): Entry => {
  if (looseEntry.type === "event" || looseEntry.type === "error") {
    // nothing gets normalized for events or errors right now
    return looseEntry as Entry;
  }

  const entry = {
    ...looseEntry,
    ...normalizeStateMutability(looseEntry as LooseStateMutabilityFields),
    type: looseEntry.type || "function"
  } as Entry;

  if (entry.type === "function") {
    entry.outputs = entry.outputs || [];
  }

  delete (entry as any).payable;
  delete (entry as any).constant;

  return entry;
};

interface LooseStateMutabilityFields {
  stateMutability?: StateMutability;
  payable?: boolean;
  constant?: boolean;
}

const normalizeStateMutability = ({
  stateMutability,
  payable,
  constant
}: LooseStateMutabilityFields): { stateMutability: StateMutability } => {
  if (stateMutability) {
    return { stateMutability };
  }

  return {
    stateMutability: payable ? "payable" : constant ? "view" : "nonpayable"
  };
};

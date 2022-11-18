import type { DBSchema } from "idb/with-async-ittr";
import type { Compilation } from "@truffle/compile-common";

export interface Schema extends DBSchema {
  Compilation: {
    key: string;
    value: {
      dataHash: string;
      data: Compilation;
      timeAdded: number;
    };
    indexes: {
      TimeAdded: number;
    };
  };
}

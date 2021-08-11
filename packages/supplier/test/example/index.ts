import { Supplier, forDefinition } from "@truffle/supplier";

import { Results } from "./types";
import { Native } from "./native";
import { RemoteSoljson } from "./remote-soljson";

export type Specification = {
  results: Results.Specification;
  options: {};
  strategies: {
    "native": Native.Specification;
    "remote-soljson": RemoteSoljson.Specification
  }
};

export const definition: Supplier.Definition<Specification> = {
  determineStrategy({ strategy }) {
    return strategy;
  },

  strategyConstructors: {
    "native": Native,
    "remote-soljson": RemoteSoljson
  }
};

export const createCompilerSupplier = forDefinition(definition);

export type { Compiler } from "./types";
export { Native, RemoteSoljson };

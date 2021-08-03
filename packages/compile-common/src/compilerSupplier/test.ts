import { Supplier, forDefinition } from "./supplier";
import { Strategy } from "./strategies";

namespace Results {
  export type Specification = {
    load: Promise<{ compile(): any }>;
    list: Promise<string[]>;
  };
}

namespace Native {
  export type Specification = {
    constructor: {
      options: { strategy: "native" };
    };
    allowsLoadingSpecificVersion: false;
    allowsListingVersions: false;
  };
}

export class NativeStrategy
  implements
    Strategy<Native.Specification & { results: Results.Specification }> {
  allowsLoadingSpecificVersion() {
    return false;
  }

  allowsListingVersions() {
    return false;
  }

  async load() {
    return { compile: (): any => null };
  }
}

namespace RemoteSoljson {
  export type Specification = {
    constructor: {
      options: { strategy: "remote-soljson" };
    };
    allowsLoadingSpecificVersion: true;
    allowsListingVersions: true;
  };
}

export class RemoteSoljsonStrategy
  implements
    Strategy<RemoteSoljson.Specification & { results: Results.Specification }> {
  allowsLoadingSpecificVersion() {
    return true;
  }

  allowsListingVersions() {
    return true;
  }

  async load(_version?: string) {
    return { compile: (): any => null };
  }

  async list(): Promise<string[]> {
    return [];
  }
}

type Specification = {
  results: Results.Specification;
  options: {};
  strategies: {
    native: Native.Specification;
    "remote-soljson": RemoteSoljson.Specification;
  };
};

const definition: Supplier.Definition<Specification> = {
  determineStrategy({ strategy }) {
    return strategy;
  },

  strategyConstructors: {
    "native": NativeStrategy,
    "remote-soljson": RemoteSoljsonStrategy
  }
};

export const createCompilerSupplier = forDefinition(definition);

{
  const supplier = createCompilerSupplier<"remote-soljson">({
    strategy: "remote-soljson"
  });

  supplier.load("0.5.0");
  supplier.list();
}

{
  const supplier = createCompilerSupplier<"native">({ strategy: "native" });

  supplier.load();
  // errors:
  // supplier.load("0.5.0");
  // supplier.list();
}

{
  const supplier = createCompilerSupplier({ strategy: "remote-soljson" });

  supplier.load();
  // errors:
  // supplier.load("0.5.0");
  // supplier.list();

  if (supplier.allowsLoadingSpecificVersion()) {
    supplier.load("0.1.0");
  }

  if (supplier.allowsListingVersions()) {
    supplier.list();
  }
}

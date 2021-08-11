import { expectType, expectError } from "tsd";

import { Compiler, createCompilerSupplier } from "test/example";


{
  const supplier = createCompilerSupplier<"remote-soljson">({
    strategy: "remote-soljson"
  });

  supplier.load("0.5.0");
  supplier.list();
}

{
  const supplier = createCompilerSupplier<"native">({ strategy: "native" });

  expectType<Promise<Compiler>>(supplier.load());
  // errors:
  expectError(supplier.load("0.5.0"));
  expectError(supplier.list());
}

{
  const supplier = createCompilerSupplier({ strategy: "remote-soljson" });

  expectType<Promise<Compiler>>(supplier.load());
  // errors:
  expectError(supplier.load("0.5.0"));
  expectError(supplier.list());

  if (supplier.allowsLoadingSpecificVersion()) {
    expectType<Promise<Compiler>>(supplier.load("0.1.0"));
  }

  if (supplier.allowsListingVersions()) {
    expectType<Promise<string[]>>(supplier.list());
  }
}

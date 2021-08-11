import assert from "assert";

import { createCompilerSupplier, Native, RemoteSoljson } from "test/example";

describe("Supplier.forDefinition", function () {
  it("selects the correct strategy", async function () {
    {
      const supplier = createCompilerSupplier({ strategy: "native" });

      assert.ok(supplier instanceof Native);
    }

    {
      const supplier = createCompilerSupplier({ strategy: "remote-soljson" });

      assert.ok(supplier instanceof RemoteSoljson);
    }
  });

  it("allows listing only when strategy allows it", async function() {
    {
      const supplier = createCompilerSupplier({ strategy: "native" });
      assert(!supplier.allowsListingVersions());

      try {
        // @ts-expect-error
        await supplier.list();

        assert.fail("Should have thrown error");
      } catch {}
    }

    {
      const supplier = createCompilerSupplier({ strategy: "remote-soljson" });

      if (!supplier.allowsListingVersions()) {
        throw new Error("Strategy should allow listing versions");
      }

      const versions = await supplier.list();

      assert.deepEqual(versions, []);
    }
  });
});

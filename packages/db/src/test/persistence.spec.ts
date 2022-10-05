import path from "path";
import { attach } from "@truffle/db/system";
import { generateId } from "./utils";
import debugModule from "debug";

import tmp from "tmp";
const tempDir = tmp.dirSync({ unsafeCleanup: true });

const debug = debugModule("db:test:persistence");

const bytecode = {
  bytes: "deadbeef",
  linkReferences: []
};

const id = generateId("bytecodes", bytecode);

const memoryAdapter = {
  name: "memory" as const
};

const indexedDbAdapter = {
  name: "indexeddb" as const,
  settings: {
    directory: path.join(tempDir.name, "indexeddb")
  }
};

describe("Memory-based Workspace", () => {
  it("does not persist data", async () => {
    // create first workspace and add to it
    const workspace1 = attach({ adapter: memoryAdapter });
    await workspace1.add("bytecodes", {
      bytecodes: [bytecode]
    });

    // make sure we can get data out of that workspace
    expect(await workspace1.get("bytecodes", id)).toBeDefined();

    // create a second workspace and don't add anything
    const workspace2 = attach({ adapter: memoryAdapter });

    // and don't get data out!
    expect(await workspace2.get("bytecodes", id)).toBeUndefined();
  });
});

describe("IndexedDb-based Workspace", () => {
  it("does persist data", async () => {
    // create first workspace and add to it
    const workspace1 = attach({ adapter: indexedDbAdapter });
    await workspace1.add("bytecodes", {
      bytecodes: [bytecode]
    });

    debug("db-path", indexedDbAdapter.settings.directory);

    // make sure we can get data out of that workspace
    expect(await workspace1.get("bytecodes", id)).toBeDefined();

    // create a second workspace and don't add anything
    const workspace2 = attach({ adapter: indexedDbAdapter });

    // but DO get data out
    expect(await workspace2.get("bytecodes", id)).toBeDefined();
  });
});

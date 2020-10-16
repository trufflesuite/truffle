import path from "path";
import { Workspace } from "..";
import { generateId } from "./utils";

import tmp from "tmp";
const tempDir = tmp.dirSync({ unsafeCleanup: true });

const bytecode = {
  bytes: "deadbeef",
  linkReferences: []
};

const id = generateId(bytecode);

const memoryAdapter = {
  name: "memory"
};

const fsAdapter = {
  name: "fs",
  settings: {
    directory: path.join(tempDir.name, "json")
  }
};

const sqliteAdapter = {
  name: "sqlite",
  settings: {
    directory: path.join(tempDir.name, "sqlite")
  }
};

describe("Memory-based Workspace", () => {
  it("does not persist data", async () => {
    // create first workspace and add to it
    const workspace1 = new Workspace({ adapter: memoryAdapter });
    await workspace1.databases.add("bytecodes", {
      bytecodes: [bytecode]
    });

    // make sure we can get data out of that workspace
    expect(await workspace1.databases.get("bytecodes", id)).toBeDefined();

    // create a second workspace and don't add anything
    const workspace2 = new Workspace({ adapter: memoryAdapter });

    // and don't get data out!
    expect(await workspace2.databases.get("bytecodes", id)).toBeNull();
  });
});

describe("FS-based Workspace", () => {
  it("does persist data", async () => {
    // create first workspace and add to it
    const workspace1 = new Workspace({ adapter: fsAdapter });
    await workspace1.databases.add("bytecodes", {
      bytecodes: [bytecode]
    });

    // make sure we can get data out of that workspace
    expect(await workspace1.databases.get("bytecodes", id)).toBeDefined();

    // create a second workspace and don't add anything
    const workspace2 = new Workspace({ adapter: fsAdapter });

    // but DO get data out
    expect(await workspace2.databases.get("bytecodes", id)).toBeDefined();
  });
});

describe("SQLite-based Workspace", () => {
  it("does persist data", async () => {
    // create first workspace and add to it
    const workspace1 = new Workspace({ adapter: sqliteAdapter });
    await workspace1.databases.add("bytecodes", {
      bytecodes: [bytecode]
    });

    // make sure we can get data out of that workspace
    expect(await workspace1.databases.get("bytecodes", id)).toBeDefined();

    // create a second workspace and don't add anything
    const workspace2 = new Workspace({ adapter: sqliteAdapter });

    // but DO get data out
    expect(await workspace2.databases.get("bytecodes", id)).toBeDefined();
  });
});

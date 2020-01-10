import { Workspace } from "..";
import { generateId, Migrations } from "./utils";

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
    directory: tempDir.name
  }
};

describe("Memory-based Workspace", () => {
  it("does not persist data", async () => {
    // create first workspace and add to it
    const workspace1 = new Workspace({ adapter: memoryAdapter });
    await workspace1.bytecodesAdd({
      input: {
        bytecodes: [bytecode]
      }
    });

    // make sure we can get data out of that workspace
    expect(await workspace1.bytecode({ id })).toBeDefined();

    // create a second workspace and don't add anything
    const workspace2 = new Workspace({ adapter: memoryAdapter });

    // and don't get data out!
    expect(await workspace2.bytecode({ id })).toBeNull();
  });
});

describe("FS-based Workspace", () => {
  it("does persist data", async () => {
    // create first workspace and add to it
    const workspace1 = new Workspace({ adapter: fsAdapter });
    await workspace1.bytecodesAdd({
      input: {
        bytecodes: [bytecode]
      }
    });

    // make sure we can get data out of that workspace
    expect(await workspace1.bytecode({ id })).toBeDefined();

    // create a second workspace and don't add anything
    const workspace2 = new Workspace({ adapter: fsAdapter });

    // but DO get data out
    expect(await workspace2.bytecode({ id })).toBeDefined();
  });
});

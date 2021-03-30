import fs from "fs-extra";
import path from "path";
import tmp from "tmp-promise";

import * as Preserve from "@truffle/preserve";
import { tests } from "./fs.fixture";
import { preserve, preserveWithEvents } from "./utils/preserve";

const writeFile = async (fullPath: string, content: string): Promise<void> => {
  // ensure directory exists for file
  await fs.ensureDir(path.dirname(fullPath));
  await fs.promises.writeFile(fullPath, content);
};

describe("Recipe", () => {
  let workspace: tmp.DirectoryResult;

  beforeAll(async () => {
    workspace = await tmp.dir();
  });

  afterAll(async () => {
    await workspace.cleanup();
  });

  for (const { name, files, targeted, expected, events } of tests) {
    describe(`test: ${name}`, () => {
      beforeAll(async () => {
        for (const file of files) {
          const fullPath = path.join(workspace.path, name, file.path);

          await writeFile(fullPath, file.content);
        }
      });

      it("returns the correct target", async () => {
        const fullPath = path.join(workspace.path, name, targeted);

        const result = await preserve({ path: fullPath });

        const target = result["fs-target"];

        const stringified = await Preserve.Targets.stringify(target);

        expect(stringified).toEqual(expected);
      });

      it("emits the correct events", async () => {
        const fullPath = path.join(workspace.path, name, targeted);

        const emittedEvents = await preserveWithEvents({ path: fullPath });

        expect(emittedEvents).toEqual(events);
      });
    });
  }
});

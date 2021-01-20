import fs from "fs-extra";
import path from "path";
import tmp from "tmp-promise";

import * as Preserve from "@truffle/preserve";
import { Loader } from "../lib";
import { tests } from "./fs.fixture";

const writeFile = async (fullPath: string, content: string): Promise<void> => {
  // ensure directory exists for file
  await fs.ensureDir(path.dirname(fullPath));

  await fs.promises.writeFile(fullPath, content);
};

describe("Loader", () => {
  let workspace: tmp.DirectoryResult;

  beforeAll(async () => {
    workspace = await tmp.dir();
  });

  afterAll(async () => {
    await workspace.cleanup();
  });

  for (const { name, files, targeted, expected } of tests) {
    describe(`test: ${name}`, () => {
      beforeAll(async () => {
        for (const file of files) {
          const fullPath = path.join(workspace.path, name, file.path);

          await writeFile(fullPath, file.content);
        }
      });

      it("returns correct target", async () => {
        const fullPath = path.join(workspace.path, name, targeted);

        const loader = new Loader();

        const target: Preserve.Target = await Preserve.Control.run(
          {
            method: loader.load.bind(loader)
          },
          {
            path: fullPath
          }
        );

        const thunked = await Preserve.Targets.stringify(target);

        expect(thunked).toEqual(expected);
      });
    });
  }
});

import fs from "fs-extra";
import path from "path";
import tmp from "tmp-promise";

import * as Preserve from "@truffle/preserve";
import { Loader } from "..";

interface File {
  path: string;
  content: string;
}

interface Test {
  name: string;
  files: File[];
  targeted: string; // path to target (will be prefixed)
  expected: Preserve.Targets.Thunked.Target;
}

const tests: Test[] = [
  {
    name: "single-file",
    files: [
      {
        path: "./a",
        content: "a"
      }
    ],
    targeted: "a",
    expected: {
      source: "a"
    }
  },
  {
    name: "extra-files",
    files: [
      {
        path: "./a",
        content: "a"
      },
      {
        path: "./b",
        content: "b"
      },
      {
        path: "./c",
        content: "c"
      }
    ],
    targeted: "b",
    expected: {
      source: "b"
    }
  },
  {
    name: "single-directory",
    files: [
      {
        path: "./directory/1",
        content: "1"
      },
      {
        path: "./directory/2",
        content: "2"
      }
    ],
    targeted: "directory",
    expected: {
      source: {
        entries: [
          {
            path: "1",
            source: "1"
          },
          {
            path: "2",
            source: "2"
          }
        ]
      }
    }
  },
  {
    name: "sub-directory",
    files: [
      {
        path: "./a/a/a",
        content: "aaa"
      },
      {
        path: "./a/b/a",
        content: "aba"
      },
      {
        path: "./a/c",
        content: "ac"
      }
    ],
    targeted: "a/a",
    expected: {
      source: {
        entries: [
          {
            path: "a",
            source: "aaa"
          }
        ]
      }
    }
  }
];

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

        const target: Preserve.Target = await Preserve.Controllers.run(
          {
            method: loader.load.bind(loader)
          },
          {
            path: fullPath
          }
        );

        const thunked = await Preserve.Targets.thunk(target);

        expect(thunked).toEqual(expected);
      });
    });
  }
});

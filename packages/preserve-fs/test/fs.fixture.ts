import * as Preserve from "@truffle/preserve";

export interface File {
  path: string;
  content: string;
}

export interface Test {
  name: string;
  files: File[];
  targeted: string; // path to target (will be prefixed)
  expected: Preserve.Targets.Stringified.Target;
}

export const tests: Test[] = [
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

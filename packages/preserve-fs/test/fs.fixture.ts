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
  events: (Preserve.Control.Event & any)[]
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
    },
    events: [
      { type: "begin", scope: [ "@truffle/preserve-fs" ] },
      {
        type: "update",
        message: "Loading target...",
        scope: [ "@truffle/preserve-fs" ]
      },
      expect.objectContaining({ type: "step" }),
      expect.objectContaining({ type: "succeed" }),
      {
        type: "succeed",
        result: { "fs-target": expect.any(Object) },
        scope: [ "@truffle/preserve-fs" ]
      }
    ]
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
    },
    events: [
      { type: "begin", scope: [ "@truffle/preserve-fs" ] },
      {
        type: "update",
        message: "Loading target...",
        scope: [ "@truffle/preserve-fs" ]
      },
      expect.objectContaining({ type: "step" }),
      expect.objectContaining({ type: "succeed" }),
      {
        type: "succeed",
        result: { "fs-target": expect.any(Object) },
        scope: [ "@truffle/preserve-fs" ]
      }
    ]
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
    },
    events: [
      { type: "begin", scope: [ "@truffle/preserve-fs" ] },
      {
        type: "update",
        message: "Loading target...",
        scope: [ "@truffle/preserve-fs" ]
      },
      expect.objectContaining({ type: "step" }),
      expect.objectContaining({ type: "step" }),
      expect.objectContaining({ type: "succeed" }),
      expect.objectContaining({ type: "step" }),
      expect.objectContaining({ type: "succeed" }),
      expect.objectContaining({ type: "succeed" }),
      {
        type: "succeed",
        result: { "fs-target": expect.any(Object) },
        scope: [ "@truffle/preserve-fs" ]
      }
    ]
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
    },
    events: [
      { type: "begin", scope: [ "@truffle/preserve-fs" ] },
      {
        type: "update",
        message: "Loading target...",
        scope: [ "@truffle/preserve-fs" ]
      },
      expect.objectContaining({ type: "step" }),
      expect.objectContaining({ type: "step" }),
      expect.objectContaining({ type: "succeed" }),
      expect.objectContaining({ type: "succeed" }),
      {
        type: "succeed",
        result: { "fs-target": expect.any(Object) },
        scope: [ "@truffle/preserve-fs" ]
      }
    ]
  }
];

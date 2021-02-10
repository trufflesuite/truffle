import * as Preserve from "@truffle/preserve";

export interface Test {
  name: string;
  target: Preserve.Target;
  events: (Preserve.Control.Event & any)[];
}

// Note that events are tested with a matcher, so we omit resolution values since
// they include deep CID objects, and we ommit connection details since the
// connection string is not deterministic.
export const tests: Test[] = [
  {
    name: "single-source",
    target: {
      source: "a"
    },
    events: [
      {
        type: "log",
        message: "Preserving to IPFS...",
        scope: ["@truffle/preserve-to-ipfs"]
      },
      { type: "step" },
      { type: "succeed" },
      {
        type: "step",
        message: "Uploading...",
        scope: ["@truffle/preserve-to-ipfs", "Uploading..."]
      },
      {
        type: "declare",
        message: "Root CID",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID"]
      },
      {
        type: "resolve",
        payload:
          "\u001b[1mQmfDmsHTywy6L9Ne5RXsj5YumDedfBLMvCvmaxjBoe6w4d\u001b[22m",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID"]
      },
      {
        type: "succeed",
        scope: ["@truffle/preserve-to-ipfs", "Uploading..."]
      }
    ]
  },
  {
    name: "two-sources",
    target: {
      source: {
        entries: [
          {
            path: "a",
            source: "aa"
          },
          {
            path: "b",
            source: "bb"
          }
        ]
      }
    },
    events: [
      {
        type: "log",
        message: "Preserving to IPFS...",
        scope: ["@truffle/preserve-to-ipfs"]
      },
      { type: "step" },
      { type: "succeed" },
      {
        type: "step",
        message: "Uploading...",
        scope: ["@truffle/preserve-to-ipfs", "Uploading..."]
      },
      {
        type: "declare",
        message: "Root CID",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID"]
      },
      {
        type: "declare",
        message: "./a",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID", "./a"]
      },
      {
        type: "declare",
        message: "./b",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID", "./b"]
      },
      {
        type: "resolve",
        payload: "QmXYDi9PbJjafcuRHDyLT4CtRmjtiDxEjaM2aYCtmKNZaj",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID", "./a"]
      },
      {
        type: "resolve",
        payload: "QmZyUAuPMneEWTdKbkRUuo8JuVW5qiCzUHLKqptzgqkVCq",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID", "./b"]
      },
      {
        type: "resolve",
        payload:
          "\u001b[1mQmSxBNxCBBAVKvPBTmuqGjinuY771zyoNf7xX836nxnQeg\u001b[22m",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID"]
      },
      {
        type: "succeed",
        scope: ["@truffle/preserve-to-ipfs", "Uploading..."]
      }
    ]
  },
  {
    name: "wrapper-directory",
    target: {
      source: {
        entries: [
          {
            path: "directory",
            source: {
              entries: [
                {
                  path: "a",
                  source: "a"
                },
                {
                  path: "b",
                  source: "b"
                }
              ]
            }
          }
        ]
      }
    },
    events: [
      {
        type: "log",
        message: "Preserving to IPFS...",
        scope: ["@truffle/preserve-to-ipfs"]
      },
      { type: "step" },
      { type: "succeed" },
      {
        type: "step",
        message: "Uploading...",
        scope: ["@truffle/preserve-to-ipfs", "Uploading..."]
      },
      {
        type: "declare",
        message: "Root CID",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID"]
      },
      {
        type: "declare",
        message: "./directory/a",
        scope: [
          "@truffle/preserve-to-ipfs",
          "Uploading...",
          "Root CID",
          "./directory/a"
        ]
      },
      {
        type: "declare",
        message: "./directory/b",
        scope: [
          "@truffle/preserve-to-ipfs",
          "Uploading...",
          "Root CID",
          "./directory/b"
        ]
      },
      {
        type: "resolve",
        payload: "QmfDmsHTywy6L9Ne5RXsj5YumDedfBLMvCvmaxjBoe6w4d",
        scope: [
          "@truffle/preserve-to-ipfs",
          "Uploading...",
          "Root CID",
          "./directory/a"
        ]
      },
      {
        type: "resolve",
        payload: "QmQLd9KEkw5eLKfr9VwfthiWbuqa9LXhRchWqD4kRPPWEf",
        scope: [
          "@truffle/preserve-to-ipfs",
          "Uploading...",
          "Root CID",
          "./directory/b"
        ]
      },
      {
        type: "resolve",
        payload:
          "\u001b[1mQmTXQNMfCiPWNPhapqXVeSpej8oaVco7uN1UUqLGwJ4Lk6\u001b[22m",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID"]
      },
      {
        type: "succeed",
        scope: ["@truffle/preserve-to-ipfs", "Uploading..."]
      }
    ]
  },
  {
    // foo/
    //  a/
    //   1
    //   2
    //  b/
    //   3
    //   4
    // bar/
    //  5
    name: "nested-directories",
    target: {
      source: {
        entries: [
          {
            path: "a",
            source: {
              entries: [
                {
                  path: "a",
                  source: "a/a"
                },
                {
                  path: "b",
                  source: "a/b"
                }
              ]
            }
          },
          {
            path: "b",
            source: "b"
          }
        ]
      }
    },
    events: [
      {
        type: "log",
        message: "Preserving to IPFS...",
        scope: ["@truffle/preserve-to-ipfs"]
      },
      { type: "step" },
      { type: "succeed" },
      {
        type: "step",
        message: "Uploading...",
        scope: ["@truffle/preserve-to-ipfs", "Uploading..."]
      },
      {
        type: "declare",
        message: "Root CID",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID"]
      },
      {
        type: "declare",
        message: "./a/a",
        scope: [
          "@truffle/preserve-to-ipfs",
          "Uploading...",
          "Root CID",
          "./a/a"
        ]
      },
      {
        type: "declare",
        message: "./a/b",
        scope: [
          "@truffle/preserve-to-ipfs",
          "Uploading...",
          "Root CID",
          "./a/b"
        ]
      },
      {
        type: "declare",
        message: "./b",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID", "./b"]
      },
      {
        type: "resolve",
        payload: "QmWTBjXt6YirUL3ABZLUJH4E8f9mHTnNaVPxmhFSuSnWqw",
        scope: [
          "@truffle/preserve-to-ipfs",
          "Uploading...",
          "Root CID",
          "./a/a"
        ]
      },
      {
        type: "resolve",
        payload: "Qmcv7sqMq3ZmE3k4k8p9b2KwAiqJ1X7nahzGrh4RZHPd3X",
        scope: [
          "@truffle/preserve-to-ipfs",
          "Uploading...",
          "Root CID",
          "./a/b"
        ]
      },
      {
        type: "resolve",
        payload: "QmQLd9KEkw5eLKfr9VwfthiWbuqa9LXhRchWqD4kRPPWEf",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID", "./b"]
      },
      {
        type: "resolve",
        payload:
          "\u001b[1mQmYrFAyZaY9VenxNxw2WTnc22S4aNhANSBkT728i2cUNFj\u001b[22m",
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID"]
      },
      {
        type: "succeed",
        scope: ["@truffle/preserve-to-ipfs", "Uploading..."]
      }
    ]
  }
];

import * as Preserve from "@truffle/preserve";
import CID from "cids";

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
        type: "begin",
        scope: ["@truffle/preserve-to-ipfs"]
      },
      {
        type: "log",
        message: "Preserving to IPFS...",
        scope: ["@truffle/preserve-to-ipfs"]
      },
      expect.objectContaining({ type: "step" }),
      expect.objectContaining({ type: "succeed" }),
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
        resolution: expect.objectContaining({ cid: expect.any(CID) }),
        payload: expect.stringMatching("QmfDmsHTywy6L9Ne5RXsj5YumDedfBLMvCvmaxjBoe6w4d"),
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID"]
      },
      {
        type: "succeed",
        scope: ["@truffle/preserve-to-ipfs", "Uploading..."]
      },
      {
        type: "succeed",
        result: expect.objectContaining({ cid: expect.any(CID) }),
        scope: ["@truffle/preserve-to-ipfs"]
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
        type: "begin",
        scope: ["@truffle/preserve-to-ipfs"]
      },
      {
        type: "log",
        message: "Preserving to IPFS...",
        scope: ["@truffle/preserve-to-ipfs"]
      },
      expect.objectContaining({ type: "step" }),
      expect.objectContaining({ type: "succeed" }),
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
        resolution: expect.objectContaining({ cid: expect.any(CID) }),
        payload: expect.stringMatching("QmXYDi9PbJjafcuRHDyLT4CtRmjtiDxEjaM2aYCtmKNZaj"),
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID", "./a"]
      },
      {
        type: "resolve",
        resolution: expect.objectContaining({ cid: expect.any(CID) }),
        payload: expect.stringMatching("QmZyUAuPMneEWTdKbkRUuo8JuVW5qiCzUHLKqptzgqkVCq"),
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID", "./b"]
      },
      {
        type: "resolve",
        resolution: expect.objectContaining({ cid: expect.any(CID) }),
        payload: expect.stringMatching("QmSxBNxCBBAVKvPBTmuqGjinuY771zyoNf7xX836nxnQeg"),
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID"]
      },
      {
        type: "succeed",
        scope: ["@truffle/preserve-to-ipfs", "Uploading..."]
      },
      {
        type: "succeed",
        result: expect.objectContaining({ cid: expect.any(CID) }),
        scope: ["@truffle/preserve-to-ipfs"]
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
        type: "begin",
        scope: ["@truffle/preserve-to-ipfs"]
      },
      {
        type: "log",
        message: "Preserving to IPFS...",
        scope: ["@truffle/preserve-to-ipfs"]
      },
      expect.objectContaining({ type: "step" }),
      expect.objectContaining({ type: "succeed" }),
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
        resolution: expect.objectContaining({ cid: expect.any(CID) }),
        payload: expect.stringMatching("QmfDmsHTywy6L9Ne5RXsj5YumDedfBLMvCvmaxjBoe6w4d"),
        scope: [
          "@truffle/preserve-to-ipfs",
          "Uploading...",
          "Root CID",
          "./directory/a"
        ]
      },
      {
        type: "resolve",
        resolution: expect.objectContaining({ cid: expect.any(CID) }),
        payload: expect.stringMatching("QmQLd9KEkw5eLKfr9VwfthiWbuqa9LXhRchWqD4kRPPWEf"),
        scope: [
          "@truffle/preserve-to-ipfs",
          "Uploading...",
          "Root CID",
          "./directory/b"
        ]
      },
      {
        type: "resolve",
        resolution: expect.objectContaining({ cid: expect.any(CID) }),
        payload: expect.stringMatching("QmTXQNMfCiPWNPhapqXVeSpej8oaVco7uN1UUqLGwJ4Lk6"),
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID"]
      },
      {
        type: "succeed",
        scope: ["@truffle/preserve-to-ipfs", "Uploading..."]
      },
      {
        type: "succeed",
        result: expect.objectContaining({ cid: expect.any(CID) }),
        scope: ["@truffle/preserve-to-ipfs"]
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
        type: "begin",
        scope: ["@truffle/preserve-to-ipfs"]
      },
      {
        type: "log",
        message: "Preserving to IPFS...",
        scope: ["@truffle/preserve-to-ipfs"]
      },
      expect.objectContaining({ type: "step" }),
      expect.objectContaining({ type: "succeed" }),
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
        resolution: expect.objectContaining({ cid: expect.any(CID) }),
        payload: expect.stringMatching("QmWTBjXt6YirUL3ABZLUJH4E8f9mHTnNaVPxmhFSuSnWqw"),
        scope: [
          "@truffle/preserve-to-ipfs",
          "Uploading...",
          "Root CID",
          "./a/a"
        ]
      },
      {
        type: "resolve",
        resolution: expect.objectContaining({ cid: expect.any(CID) }),
        payload: expect.stringMatching("Qmcv7sqMq3ZmE3k4k8p9b2KwAiqJ1X7nahzGrh4RZHPd3X"),
        scope: [
          "@truffle/preserve-to-ipfs",
          "Uploading...",
          "Root CID",
          "./a/b"
        ]
      },
      {
        type: "resolve",
        resolution: expect.objectContaining({ cid: expect.any(CID) }),
        payload: expect.stringMatching("QmQLd9KEkw5eLKfr9VwfthiWbuqa9LXhRchWqD4kRPPWEf"),
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID", "./b"]
      },
      {
        type: "resolve",
        resolution: expect.objectContaining({ cid: expect.any(CID) }),
        payload: expect.stringMatching("QmYrFAyZaY9VenxNxw2WTnc22S4aNhANSBkT728i2cUNFj"),
        scope: ["@truffle/preserve-to-ipfs", "Uploading...", "Root CID"]
      },
      {
        type: "succeed",
        scope: ["@truffle/preserve-to-ipfs", "Uploading..."]
      },
      {
        type: "succeed",
        result: expect.objectContaining({ cid: expect.any(CID) }),
        scope: ["@truffle/preserve-to-ipfs"]
      }
    ]
  }
];

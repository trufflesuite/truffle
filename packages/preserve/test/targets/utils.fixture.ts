import { Normalized, Stringified } from "../../lib/targets";
import { Target } from "../../lib";

export interface Test {
  name: string;
  raw: Target;
  normalized: Normalized.Target;
  stringified: Stringified.Target;
}

const arrayToAsyncIterable = async function* (array: any[]) {
  for (const element of array) {
    yield element;
  }
};

export const tests: Test[] = [
  {
    name: "Simple source",
    raw: {
      source: Buffer.from("c0ffee", "hex")
    },
    normalized: {
      source: arrayToAsyncIterable([Buffer.from("c0ffee", "hex")])
    },
    stringified: {
      source: Buffer.from("c0ffee", "hex").toString("utf8")
    }
  },
  {
    name: "Simple directory without nesting",
    raw: {
      source: {
        entries: [
          {
            path: "a",
            source: Buffer.from("Coffee", "utf8")
          }
        ]
      }
    },
    normalized: {
      source: {
        entries: arrayToAsyncIterable([
          {
            path: "a",
            source: arrayToAsyncIterable([Buffer.from("Coffee", "utf8")])
          }
        ])
      }
    },
    stringified: {
      source: {
        entries: [
          {
            path: "a",
            source: "Coffee"
          }
        ]
      }
    }
  },
  {
    name: "Complex nested directory with inconsistent types",
    raw: {
      source: {
        entries: [
          {
            path: "a",
            source: {
              entries: [
                {
                  path: "a/a",
                  source: Buffer.from("c0ffee", "hex")
                },
                {
                  path: "a/b",
                  source: "Coffee"
                }
              ]
            }
          },
          {
            path: "b",
            source: Buffer.from("Coffee", "utf8")
          },
          {
            path: "c",
            source: {
              entries: [
                {
                  path: "c/a",
                  source: new Uint8Array([0, 0, 0, 0])
                }
              ]
            }
          }
        ]
      }
    },
    normalized: {
      source: {
        entries: arrayToAsyncIterable([
          {
            path: "a",
            source: {
              entries: arrayToAsyncIterable([
                {
                  path: "a/a",
                  source: arrayToAsyncIterable([Buffer.from("c0ffee", "hex")])
                },
                {
                  path: "a/b",
                  source: arrayToAsyncIterable([Buffer.from("Coffee", "utf8")])
                }
              ])
            }
          },
          {
            path: "b",
            source: arrayToAsyncIterable([Buffer.from("Coffee", "utf8")])
          },
          {
            path: "c",
            source: {
              entries: arrayToAsyncIterable([
                {
                  path: "c/a",
                  source: arrayToAsyncIterable([Buffer.from("00000000", "hex")])
                }
              ])
            }
          }
        ])
      }
    },
    stringified: {
      source: {
        entries: [
          {
            path: "a",
            source: {
              entries: [
                {
                  path: "a/a",
                  source: Buffer.from("c0ffee", "hex").toString("utf8")
                },
                {
                  path: "a/b",
                  source: "Coffee"
                }
              ]
            }
          },
          {
            path: "b",
            source: "Coffee"
          },
          {
            path: "c",
            source: {
              entries: [
                {
                  path: "c/a",
                  source: Buffer.from("00000000", "hex").toString("utf8")
                }
              ]
            }
          }
        ]
      }
    }
  }
];

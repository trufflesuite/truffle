import { asyncToArray } from "iter-tools";
const IpfsdCtl: any = require("ipfsd-ctl");
const IpfsHttpClient: any = require("ipfs-http-client");

import * as Preserve from "@truffle/preserve";

import { Recipe, Label } from "..";
import { fetch } from "../../test/fetch";

const IPFS_BIN = "./node_modules/.bin/jsipfs";

interface IpfsNode {
  apiAddr: {
    toString(): string;
  };
  stop(): Promise<void>;
}

interface Test {
  name: string;
  target: Preserve.Target;
}

const tests: Test[] = [
  {
    name: "single-source",
    target: {
      source: "a"
    }
  },
  {
    name: "two-sources",
    target: {
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
    }
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
    }
  }
];

describe("preserve", () => {
  let node: IpfsNode;
  let address: string;

  beforeAll(async () => {
    jest.setTimeout(20000);

    node = await IpfsdCtl.createController({
      type: "js",
      ipfsBin: IPFS_BIN,
      test: true,
      disposable: true,
      ipfsHttpModule: IpfsHttpClient
    });

    address = node.apiAddr.toString();
  });

  afterAll(async () => {
    await node.stop();
  });

  for (const { name, target } of tests) {
    // separate describe block for each test case
    describe(`test: ${name}`, () => {
      let ipfs: any; // client

      beforeAll(async () => {
        ipfs = IpfsHttpClient(address);
      });

      it("saves correctly to IPFS", async () => {
        const recipe = new Recipe({ address });

        const { cid } = await Preserve.run(recipe, { target });

        const retrieved = await fetch({ cid, ipfs });

        expect(await Preserve.Targets.thunk(retrieved)).toEqual(
          await Preserve.Targets.thunk(target)
        );
      });
    });
  }
});

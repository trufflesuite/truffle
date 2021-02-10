const IpfsdCtl = require("ipfsd-ctl");
import createIpfsClient from "ipfs-http-client";

import * as Preserve from "@truffle/preserve";

import { Recipe } from "../lib";
import { tests } from "./ipfs.fixture";
import { fetch } from "./utils/fetch";
import { asyncToArray } from "iter-tools";
import { IpfsClient } from "../lib/ipfs-adapter";

const IPFS_BIN = `${__dirname}/../node_modules/.bin/jsipfs`;

interface IpfsNode {
  apiAddr: {
    toString(): string;
  };
  stop(): Promise<void>;
}

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
      ipfsHttpModule: createIpfsClient
    });

    address = node.apiAddr.toString();
  });

  afterAll(async () => {
    await node.stop();
  });

  for (const { name, target, events } of tests) {
    // separate describe block for each test case
    describe(`test: ${name}`, () => {
      let ipfs: IpfsClient;

      beforeAll(async () => {
        ipfs = createIpfsClient({ url: address });
      });

      it("saves correctly to IPFS", async () => {
        const recipe = new Recipe({ address });

        // Call the preserve-to-ipfs preserve function through the Preserve controller.
        const { cid } = await Preserve.Control.run(
          {
            method: recipe.preserve.bind(recipe)
          },
          { target }
        );

        const retrieved = await fetch({ cid, ipfs });

        expect(await Preserve.Targets.stringify(retrieved)).toEqual(
          await Preserve.Targets.stringify(target)
        );
      });

      it("emits the correct events", async () => {
        const recipe = new Recipe({ address });

        const emittedEvents = await asyncToArray(
          recipe.preserve({
            target,
            controls: new Preserve.Control.StepsController({
              scope: ["@truffle/preserve-to-ipfs"]
            })
          })
        );

        expect(emittedEvents).toMatchObject(events);
      });
    });
  }
});

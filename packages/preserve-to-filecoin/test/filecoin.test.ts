import * as Preserve from "@truffle/preserve";
import * as PreserveToIpfs from "@truffle/preserve-to-ipfs";
import CID from "cids";
import { asyncToArray } from "iter-tools";

import { Recipe } from "../lib";
import { createLotusClient } from "../lib/connect";
import { getDealState } from "../lib/wait";
import { tests } from "./filecoin.fixture";

jest.setTimeout(200000);

describe("preserve", () => {
  // Default IPFS and Filecoin nodes exposed by Powergate localnet
  const ipfsAddress = "http://localhost:5001/api/v0";
  const filecoinAddress = "http://localhost:7777/rpc/v0";

  for (const { name, target, events } of tests) {
    // separate describe block for each test case
    describe(`test: ${name}`, () => {
      let cid: CID;

      // Run preserve-to-ipfs before running preserve-to-filecoin
      beforeAll(async () => {
        const recipe = new PreserveToIpfs.Recipe({ address: ipfsAddress });

        const result: PreserveToIpfs.Result = await Preserve.Control.run(
          {
            method: recipe.preserve.bind(recipe)
          },
          { target }
        );

        cid = result.cid;
      });

      it("stores to Filecoin correctly", async () => {
        const recipe = new Recipe({ address: filecoinAddress });

        const { dealCid } = await Preserve.Control.run(
          {
            method: recipe.preserve.bind(recipe)
          },
          {
            target: target,
            results: new Map([["@truffle/preserve-to-ipfs", { cid }]])
          }
        );

        const client = createLotusClient({ url: filecoinAddress });
        const state = await getDealState(dealCid, client);

        expect(state).toEqual("Active");
      });

      it("emits the correct events", async () => {
        const recipe = new Recipe({ address: filecoinAddress });

        const emittedEvents = await asyncToArray(
          recipe.preserve({
            target,
            results: new Map([["@truffle/preserve-to-ipfs", { cid }]]),
            controls: new Preserve.Control.StepsController({
              scope: ["@truffle/preserve-to-filecoin"]
            })
          })
        );

        expect(emittedEvents).toMatchObject(events);
      });

      it.todo("Some Filecoin retrieval test");
    });
  }
});

import * as Preserve from "@truffle/preserve";
import * as PreserveToIpfs from "@truffle/preserve-to-ipfs";

import { Recipe } from "../lib";
import { createLotusClient } from "../lib/connect";
import { getDealState } from "../lib/wait";
import { tests } from "./filecoin.fixture";

jest.setTimeout(200000);

describe("preserve", () => {
  // Default IPFS and Filecoin nodes exposed by Powergate localnet
  const ipfsAddress = "http://localhost:5001/api/v0";
  const filecoinAddress = "http://localhost:7777/rpc/v0";

  for (const { name, target } of tests) {
    // separate describe block for each test case
    describe(`test: ${name}`, () => {
      it("stores to Filecoin correctly", async () => {
        const ipfsRecipe = new PreserveToIpfs.Recipe({ address: ipfsAddress });

        const { cid } = await Preserve.Control.run(
          {
            method: ipfsRecipe.preserve.bind(ipfsRecipe)
          },
          { target }
        );

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
    });
  }
});

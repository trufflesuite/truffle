import CID from "cids";
import { createLotusClient } from "../lib/connect";
import { getDealState } from "../lib/wait";
import { tests } from "./filecoin.fixture";
import {
  preserveToFilecoin,
  preserveToFilecoinWithEvents,
  preserveToIpfs
} from "./utils/preserve";

jest.setTimeout(200000);

describe("preserve", () => {
  // Default IPFS and Filecoin nodes exposed by Powergate localnet
  const ipfsAddress = "http://localhost:5001/api/v0";
  const filecoinAddress = "http://localhost:7777/rpc/v0";

  describe("error handling", () => {
    it("should fail when providing content instead of container", async () => {
      const target = { source: "content string" };
      const cid = await preserveToIpfs(target, ipfsAddress);

      const emittedEvents = await preserveToFilecoinWithEvents(target, cid, {
        address: filecoinAddress
      });

      const expectedEvents = [
        { type: "begin", scope: ["@truffle/preserve-to-filecoin"] },
        {
          type: "fail",
          error: {
            message:
              "@truffle/preserve-to-filecoin only supports preserving directories at this time."
          },
          scope: ["@truffle/preserve-to-filecoin"]
        }
      ];

      expect(emittedEvents).toMatchObject(expectedEvents);
    });

    it("should fail when unable to connect with Lotus client", async () => {
      const target = {
        source: {
          entries: [
            {
              path: "a",
              source: "content"
            }
          ]
        }
      };

      const cid = await preserveToIpfs(target, ipfsAddress);

      const emittedEvents = await preserveToFilecoinWithEvents(target, cid, {
        address: "http://localhost:8888/rpc/v0"
      });

      const expectedEvents = [
        { type: "begin", scope: ["@truffle/preserve-to-filecoin"] },
        {
          type: "log",
          message: "Preserving to Filecoin...",
          scope: ["@truffle/preserve-to-filecoin"]
        },
        {
          type: "step",
          message:
            "Connecting to Filecoin node at http://localhost:8888/rpc/v0...",
          scope: [
            "@truffle/preserve-to-filecoin",
            "Connecting to Filecoin node at http://localhost:8888/rpc/v0..."
          ]
        },
        {
          type: "fail",
          error: expect.objectContaining({
            message:
              "request to http://localhost:8888/rpc/v0 failed, reason: connect ECONNREFUSED 127.0.0.1:8888"
          }),
          scope: [
            "@truffle/preserve-to-filecoin",
            "Connecting to Filecoin node at http://localhost:8888/rpc/v0..."
          ]
        },
        { type: "abort", scope: ["@truffle/preserve-to-filecoin"] }
      ];

      expect(emittedEvents).toMatchObject(expectedEvents);
    });

    it.todo("should fail if no miners can be found?");
    it.todo(
      "some tests to check incorrect configurable parameters once they're implemented"
    );
  });

  for (const { name, target, events } of tests) {
    // separate describe block for each test case
    describe(`test: ${name}`, () => {
      let cid: CID;

      // Run preserve-to-ipfs before running preserve-to-filecoin
      beforeAll(async () => {
        cid = await preserveToIpfs(target, ipfsAddress);
      });

      it("stores to Filecoin correctly", async () => {
        const dealCid = await preserveToFilecoin(target, cid, {
          address: filecoinAddress
        });

        const client = createLotusClient({ url: filecoinAddress });
        const state = await getDealState(dealCid, client);

        expect(state).toEqual("Active");
      });

      it("emits the correct events", async () => {
        const emittedEvents = await preserveToFilecoinWithEvents(target, cid, {
          address: filecoinAddress
        });
        expect(emittedEvents).toMatchObject(events);
      });

      it.todo("Some Filecoin retrieval test");
    });
  }
});

import CID from "cids";
import { createLotusClient } from "../lib/connect";
import { getDealInfo, getDealState } from "../lib/wait";
import { tests } from "./filecoin.fixture";
import {
  preserveToFilecoin,
  preserveToFilecoinWithEvents,
  preserveToIpfs
} from "./utils/preserve";
import Ganache from "ganache";

jest.setTimeout(200000);

describe("preserve", () => {
  // Default IPFS and Filecoin nodes exposed by Ganache
  const ipfsAddress = "http://localhost:5001/api/v0";
  const filecoinAddress = "http://localhost:7777/rpc/v0";

  let ganacheServer: any;

  beforeAll(async () => {
    ganacheServer = Ganache.server({
      flavor: "filecoin",
      miner: {
        instamine: "strict"
      },
      logging: {
        quiet: true
      }
    });
    await ganacheServer.provider.blockchain.waitForReady();
    await ganacheServer.listen(7777);
  });

  afterAll(async () => {
    await ganacheServer?.close();
  });

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
        address: "http://localhost:1111/rpc/v0"
      });

      const expectedEvents = [
        { type: "begin", scope: ["@truffle/preserve-to-filecoin"] },
        {
          type: "update",
          message: "Preserving to Filecoin...",
          scope: ["@truffle/preserve-to-filecoin"]
        },
        {
          type: "step",
          message:
            "Connecting to Filecoin node at http://localhost:1111/rpc/v0...",
          scope: [
            "@truffle/preserve-to-filecoin",
            "Connecting to Filecoin node at http://localhost:1111/rpc/v0..."
          ]
        },
        {
          type: "fail",
          error: expect.objectContaining({
            message:
              "request to http://localhost:1111/rpc/v0 failed, reason: connect ECONNREFUSED 127.0.0.1:1111"
          }),
          scope: [
            "@truffle/preserve-to-filecoin",
            "Connecting to Filecoin node at http://localhost:1111/rpc/v0..."
          ]
        },
        { type: "abort", scope: ["@truffle/preserve-to-filecoin"] }
      ];

      expect(emittedEvents).toMatchObject(expectedEvents);
    });

    it("should fail when an invalid wallet address is specified", async () => {
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
        address: filecoinAddress,
        storageDealOptions: {
          walletAddress: "f17uoq6tp427uzv7fztkbsnn64iwotfrristwpryy"
        }
      });

      const expectedEvents = [
        { type: "begin", scope: ["@truffle/preserve-to-filecoin"] },
        {
          type: "update",
          message: "Preserving to Filecoin...",
          scope: ["@truffle/preserve-to-filecoin"]
        },
        {
          type: "step",
          message:
            "Connecting to Filecoin node at http://localhost:7777/rpc/v0...",
          scope: [
            "@truffle/preserve-to-filecoin",
            "Connecting to Filecoin node at http://localhost:7777/rpc/v0..."
          ]
        },
        {
          type: "succeed",
          result: expect.any(String),
          scope: [
            "@truffle/preserve-to-filecoin",
            "Connecting to Filecoin node at http://localhost:7777/rpc/v0..."
          ]
        },
        {
          type: "step",
          message: "Retrieving miners...",
          scope: ["@truffle/preserve-to-filecoin", "Retrieving miners..."]
        },
        {
          type: "succeed",
          result: ["t01000"],
          scope: ["@truffle/preserve-to-filecoin", "Retrieving miners..."]
        },
        {
          type: "step",
          message: "Proposing storage deal...",
          scope: ["@truffle/preserve-to-filecoin", "Proposing storage deal..."]
        },
        {
          type: "declare",
          message: "Deal CID",
          scope: [
            "@truffle/preserve-to-filecoin",
            "Proposing storage deal...",
            "Deal CID"
          ]
        },
        {
          type: "stop",
          scope: [
            "@truffle/preserve-to-filecoin",
            "Proposing storage deal...",
            "Deal CID"
          ]
        },
        {
          type: "fail",
          error: expect.objectContaining({
            message: expect.stringMatching(
              /provided address doesn't exist in wallet|Ganache doesn't have the private key for account/
            )
          }),
          scope: ["@truffle/preserve-to-filecoin", "Proposing storage deal..."]
        },
        { type: "abort", scope: ["@truffle/preserve-to-filecoin"] }
      ];

      expect(emittedEvents).toMatchObject(expectedEvents);
    });

    describe.skip("Lotus policy (does not work with Ganache)", () => {
      it("should fail when storage duration is < 518400 blocks", async () => {
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
          address: filecoinAddress,
          storageDealOptions: {
            duration: 10
          }
        });

        const expectedEvents = [
          { type: "begin", scope: ["@truffle/preserve-to-filecoin"] },
          {
            type: "update",
            message: "Preserving to Filecoin...",
            scope: ["@truffle/preserve-to-filecoin"]
          },
          {
            type: "step",
            message:
              "Connecting to Filecoin node at http://localhost:7777/rpc/v0...",
            scope: [
              "@truffle/preserve-to-filecoin",
              "Connecting to Filecoin node at http://localhost:7777/rpc/v0..."
            ]
          },
          {
            type: "succeed",
            result: expect.any(String),
            scope: [
              "@truffle/preserve-to-filecoin",
              "Connecting to Filecoin node at http://localhost:7777/rpc/v0..."
            ]
          },
          {
            type: "step",
            message: "Retrieving miners...",
            scope: ["@truffle/preserve-to-filecoin", "Retrieving miners..."]
          },
          {
            type: "succeed",
            result: ["f01000"],
            scope: ["@truffle/preserve-to-filecoin", "Retrieving miners..."]
          },
          {
            type: "step",
            message: "Proposing storage deal...",
            scope: [
              "@truffle/preserve-to-filecoin",
              "Proposing storage deal..."
            ]
          },
          {
            type: "declare",
            message: "Deal CID",
            scope: [
              "@truffle/preserve-to-filecoin",
              "Proposing storage deal...",
              "Deal CID"
            ]
          },
          {
            type: "resolve",
            resolution: expect.any(CID),
            payload: expect.any(String),
            scope: [
              "@truffle/preserve-to-filecoin",
              "Proposing storage deal...",
              "Deal CID"
            ]
          },
          {
            type: "succeed",
            scope: [
              "@truffle/preserve-to-filecoin",
              "Proposing storage deal..."
            ]
          },
          {
            type: "step",
            message: "Waiting for deal to finish...",
            scope: [
              "@truffle/preserve-to-filecoin",
              "Waiting for deal to finish..."
            ]
          },
          {
            type: "fail",
            error: expect.objectContaining({
              message: expect.stringContaining(
                "Deal failed: unexpected deal status while waiting for data request: 11 (StorageDealFailing). Provider message: deal rejected: deal duration out of bounds"
              )
            }),
            scope: [
              "@truffle/preserve-to-filecoin",
              "Waiting for deal to finish..."
            ]
          },
          { type: "abort", scope: ["@truffle/preserve-to-filecoin"] }
        ];

        expect(emittedEvents).toMatchObject(expectedEvents);
      });

      it("should fail when epoch price is too low", async () => {
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
          address: filecoinAddress,
          storageDealOptions: {
            epochPrice: "1"
          }
        });

        const expectedEvents = [
          { type: "begin", scope: ["@truffle/preserve-to-filecoin"] },
          {
            type: "update",
            message: "Preserving to Filecoin...",
            scope: ["@truffle/preserve-to-filecoin"]
          },
          {
            type: "step",
            message:
              "Connecting to Filecoin node at http://localhost:7777/rpc/v0...",
            scope: [
              "@truffle/preserve-to-filecoin",
              "Connecting to Filecoin node at http://localhost:7777/rpc/v0..."
            ]
          },
          {
            type: "succeed",
            result: expect.any(String),
            scope: [
              "@truffle/preserve-to-filecoin",
              "Connecting to Filecoin node at http://localhost:7777/rpc/v0..."
            ]
          },
          {
            type: "step",
            message: "Retrieving miners...",
            scope: ["@truffle/preserve-to-filecoin", "Retrieving miners..."]
          },
          {
            type: "succeed",
            result: ["f01000"],
            scope: ["@truffle/preserve-to-filecoin", "Retrieving miners..."]
          },
          {
            type: "step",
            message: "Proposing storage deal...",
            scope: [
              "@truffle/preserve-to-filecoin",
              "Proposing storage deal..."
            ]
          },
          {
            type: "declare",
            message: "Deal CID",
            scope: [
              "@truffle/preserve-to-filecoin",
              "Proposing storage deal...",
              "Deal CID"
            ]
          },
          {
            type: "resolve",
            resolution: expect.any(CID),
            payload: expect.any(String),
            scope: [
              "@truffle/preserve-to-filecoin",
              "Proposing storage deal...",
              "Deal CID"
            ]
          },
          {
            type: "succeed",
            scope: [
              "@truffle/preserve-to-filecoin",
              "Proposing storage deal..."
            ]
          },
          {
            type: "step",
            message: "Waiting for deal to finish...",
            scope: [
              "@truffle/preserve-to-filecoin",
              "Waiting for deal to finish..."
            ]
          },
          {
            type: "fail",
            error: expect.objectContaining({
              message: expect.stringContaining(
                "Deal failed: unexpected deal status while waiting for data request: 11 (StorageDealFailing). Provider message: deal rejected: storage price per epoch less than asking price"
              )
            }),
            scope: [
              "@truffle/preserve-to-filecoin",
              "Waiting for deal to finish..."
            ]
          },
          { type: "abort", scope: ["@truffle/preserve-to-filecoin"] }
        ];

        expect(emittedEvents).toMatchObject(expectedEvents);
      });
    });

    it.todo("should fail if no miners can be found?");
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
        const dealInfo = await getDealInfo(dealCid, client);
        const state = await getDealState(dealInfo, client);

        expect(state).toEqual("StorageDealActive");
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

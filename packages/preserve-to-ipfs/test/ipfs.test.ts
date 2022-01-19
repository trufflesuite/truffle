import createIpfsClient from "ipfs-http-client";

import * as Preserve from "@truffle/preserve";

import { tests } from "./ipfs.fixture";
import { fetch } from "./utils/fetch";
import { IpfsClient } from "../lib/ipfs-adapter";
import { preserveToIpfs, preserveToIpfsWithEvents } from "./utils/preserve";
import Ganache from "ganache";

jest.setTimeout(20000);

describe("preserve", () => {
  // Default IPFS nodes exposed by Ganache
  const address = "http://localhost:5001/api/v0";

  let ganacheServer: any;
  let ipfsClient: IpfsClient;

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

    ipfsClient = createIpfsClient({ url: address });
  });

  afterAll(async () => {
    await ganacheServer?.close();
  });

  for (const { name, target, events } of tests) {
    // separate describe block for each test case
    describe(`test: ${name}`, () => {
      it("saves correctly to IPFS", async () => {
        const cid = await preserveToIpfs(target, address);

        const retrieved = await fetch({ cid, ipfs: ipfsClient });

        expect(await Preserve.Targets.stringify(retrieved)).toEqual(
          await Preserve.Targets.stringify(target)
        );
      });

      it("emits the correct events", async () => {
        const emittedEvents = await preserveToIpfsWithEvents(target, address);

        expect(emittedEvents).toMatchObject(events);
      });
    });
  }
});

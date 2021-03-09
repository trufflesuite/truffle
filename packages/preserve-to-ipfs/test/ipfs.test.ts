import createIpfsClient from "ipfs-http-client";

import * as Preserve from "@truffle/preserve";

import { tests } from "./ipfs.fixture";
import { fetch } from "./utils/fetch";
import { IpfsClient } from "../lib/ipfs-adapter";
import { describeForNode12 } from "./utils/conditional";
import { preserveToIpfs, preserveToIpfsWithEvents } from "./utils/preserve";

const IPFS_BIN = `${__dirname}/../node_modules/.bin/jsipfs`;

interface IpfsNode {
  apiAddr: {
    toString(): string;
  };
  stop(): Promise<void>;
}

describeForNode12("preserve", () => {
  const IpfsdCtl = require("ipfsd-ctl");

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
        const cid = await preserveToIpfs(target, address);

        const retrieved = await fetch({ cid, ipfs });

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

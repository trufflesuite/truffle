import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:projects:test:contractInstances");

import gql from "graphql-tag";

import { connect } from "@truffle/db";
import * as Project from "@truffle/db/project";
import { resources, Run } from "@truffle/db/process";
import type { IdObject, Input, Resource } from "@truffle/db/resources";
//todo web3js-migration unskip
describe.skip("Project.contractInstances", () => {
  describe("for networks with differing contract revisions", () => {
    it("resolves contract-instances correctly", async () => {
      /*
       * Setup
       */
      const db = connect({ adapter: { name: "memory" } });
      const { run } = Run.forDb(db);
      const project = await Project.initialize({
        db,
        project: { directory: "/" }
      });

      /*
       * Common definitions: test two contracts on two different networks
       */
      const A = { name: "A" };
      const B = { name: "B" };
      const vnet = { name: "vnet", networkId: "v" };
      const wnet = { name: "wnet", networkId: "w" };

      /*
       * First, simulate deployment of A and B to vnet
       */
      {
        // create network resources
        const vnets = (await run(resources.load, "networks", [
          { ...vnet, historicBlock: { height: 0, hash: "v0" } },
          { ...vnet, historicBlock: { height: 1, hash: "v1" } },
          { ...vnet, historicBlock: { height: 2, hash: "v2" } }
        ])) as IdObject<"networks">[];
        await run(resources.load, "networkGenealogies", [
          { ancestor: vnets[0], descendant: vnets[1] },
          { ancestor: vnets[1], descendant: vnets[2] }
        ] as Input<"networkGenealogies">[]);

        // create contracts
        const contracts = (await run(resources.load, "contracts", [
          { ...A, abi: { json: JSON.stringify("a1") } },
          { ...B, abi: { json: JSON.stringify("b1") } }
        ])) as IdObject<"contracts">[];

        // assign names
        await project.assignNames({
          assignments: {
            contracts,
            networks: [vnets[2]]
          }
        });

        // create contract instances
        await run(resources.load, "contractInstances", [
          // Deploy A in first block after genesis (skip genesis for fun)
          { contract: contracts[0], network: vnets[1], address: "v-a" },
          // Deploy B after
          { contract: contracts[1], network: vnets[2], address: "v-b" }
        ]);
      }

      /*
       * Then, revise A and B and deploy new revisions to wnet
       */
      {
        // create network resources
        const wnets = (await run(resources.load, "networks", [
          { ...wnet, historicBlock: { height: 0, hash: "w0" } },
          { ...wnet, historicBlock: { height: 1, hash: "w1" } },
          { ...wnet, historicBlock: { height: 2, hash: "w2" } }
        ])) as IdObject<"networks">[];
        await run(resources.load, "networkGenealogies", [
          { ancestor: wnets[0], descendant: wnets[1] },
          { ancestor: wnets[1], descendant: wnets[2] }
        ]);

        // create contracts
        const contracts = (await run(resources.load, "contracts", [
          { ...A, abi: { json: JSON.stringify("a2") } },
          { ...B, abi: { json: JSON.stringify("b2") } }
        ])) as IdObject<"contracts">[];

        // assign names
        await project.assignNames({
          assignments: {
            contracts,
            networks: [wnets[2]]
          }
        });

        // create contract instances
        await run(resources.load, "contractInstances", [
          // Deploy A in first block after genesis (skip genesis for fun)
          { contract: contracts[0], network: wnets[1], address: "w-a" },
          // Deploy B after
          { contract: contracts[1], network: wnets[2], address: "w-b" }
        ]);
      }

      /*
       * Prepare to query results
       */
      let fragmentIndex = 0;
      const forNetwork = networkName => gql`
        fragment ForNetwork__${fragmentIndex++} on Project {
          contractInstances(
            network: { name: "${networkName}" }
          ) {
            address
            network {
              networkId
            }
            contract {
              name
              abi { json }
            }
          }
        }
      `;

      /*
       * vnet should have the old versions
       */
      {
        const { contractInstances } = (await run(
          resources.get,
          "projects",
          project.id,
          forNetwork("vnet")
        )) as Resource<"projects">;

        const a = contractInstances.find(
          // @ts-ignore covered by expectations
          ({ contract: { name } }) => name === "A"
        );

        expect(a).toBeDefined();
        // @ts-ignore
        expect(a.address).toEqual("v-a");
        // @ts-ignore
        expect(a.network.networkId).toEqual("v");
        // @ts-ignore
        expect(a.contract.abi.json).toEqual(JSON.stringify("a1"));

        const b = contractInstances.find(
          // @ts-ignore covered by expectations
          ({ contract: { name } }) => name === "B"
        );

        expect(b).toBeDefined();
        // @ts-ignore
        expect(b.address).toEqual("v-b");
        // @ts-ignore
        expect(b.network.networkId).toEqual("v");
        // @ts-ignore
        expect(b.contract.abi.json).toEqual(JSON.stringify("b1"));
      }

      /*
       * wnet should have the new versions
       */
      {
        // @ts-ignore
        const { contractInstances }: Resource<"projects"> = await run(
          resources.get,
          "projects",
          project.id,
          forNetwork("wnet")
        );

        const a = contractInstances.find(
          // @ts-ignore covered by expectations
          ({ contract: { name } }) => name === "A"
        );

        expect(a).toBeDefined();
        // @ts-ignore
        expect(a.address).toEqual("w-a");
        // @ts-ignore
        expect(a.network.networkId).toEqual("w");
        // @ts-ignore
        expect(a.contract.abi.json).toEqual(JSON.stringify("a2"));

        const b = contractInstances.find(
          // @ts-ignore covered by expectations
          ({ contract: { name } }) => name === "B"
        );

        expect(b).toBeDefined();
        // @ts-ignore
        expect(b.address).toEqual("w-b");
        // @ts-ignore
        expect(b.network.networkId).toEqual("w");
        // @ts-ignore
        expect(b.contract.abi.json).toEqual(JSON.stringify("b2"));
      }
    });
  });
});

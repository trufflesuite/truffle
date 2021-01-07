import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:networkGenealogies:test");

import gql from "graphql-tag";
import { testProp } from "jest-fast-check";
import * as fc from "fast-check";

import { Networks, Batches } from "test/arbitraries/networks";

import { resources } from "@truffle/db/process";
import { Resource } from "@truffle/db/resources";
import { generateNetworkGenealogiesLoad } from "..";

import { mockProvider } from "./mockProvider";
import { setupProjectForTest } from "./setup";
import { prepareArtifacts } from "./artifacts";
import { plan } from "./plan";

const testConfig = process.env["OVERKILL"]
  ? {
      timeout: 5 * 60 * 1000, // 5 min
      numRuns: 250
    }
  : {
      timeout: 30 * 1000, // 30 sec
      numRuns: 10
    };

describe("generateNetworkGenealogiesLoad", () => {
  describe("for arbitrary batches of networks from an arbitrary set of arbitrarily forked blockchains", () => {
    jest.setTimeout(testConfig.timeout);

    testProp(
      `saves network genealogies so that @truffle/db correctly reports known latest descendant networks (numRuns: ${testConfig.numRuns})`,
      [
        Networks().chain(model => fc.record({
          model: fc.constant(model),
          batches: Batches(model)
        })),
        fc.boolean()
      ],
      async ({ model, batches }, disableIndex) => {
        debug("initializing project");
        const { project } = await setupProjectForTest({
          identifier: "test:networkGenealogies:property:latestDescendants"
        });

        // iterate over each batch
        for (const batch of batches) {
          debug("preparing artifacts for batch");
          const { network, artifacts } = await prepareArtifacts({
            project,
            model,
            batch
          });

          debug("connecting with mocked provider");
          const provider = mockProvider({ model, batch });
          const liveProject = project.connect({ provider });

          debug("loading network genealogies for batch");
          await liveProject.run(
            generateNetworkGenealogiesLoad,
            { network, artifacts, disableIndex }
          );
        }

        // compute expected
        const { expectedLatestDescendants } = plan({ model, batches });
        debug("expectedLatestDescendants %O", expectedLatestDescendants);

        const networks = (await project.run(
          resources.all,
          "networks",
          gql`
            fragment NetworkAncestors on Network {
              id
              historicBlock {
                height
              }
              descendants(includeSelf: true, onlyLatest: true) {
                id
              }
            }
          `
        )) as Resource<"networks">[];
        debug("networks %O", networks);

        const ids = new Set(networks
          .filter(({ descendants }) => descendants.length > 0)
          .map(({ descendants: [ latestDescendant ] }) => latestDescendant.id));
        debug("ids %O", ids);

        expect(ids).toEqual(
          new Set(expectedLatestDescendants.map(({ id }) => id))
        );
      },

      { numRuns: testConfig.numRuns }
    );
  });
});

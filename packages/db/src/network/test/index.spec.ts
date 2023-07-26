import { logger } from "@truffle/db/logger";
const debug = logger("db:network:test");

import gql from "graphql-tag";
import { testProp } from "@fast-check/jest";
import * as fc from "fast-check";

import * as Arbitrary from "test/arbitraries/networks";

import { Query } from "@truffle/db/process";
import * as Network from "..";

import { mockProvider } from "./mockProvider";
import { setup } from "./setup";
import { plan } from "./plan";

const testConfig = process.env["OVERKILL"]
  ? {
      timeout: 5 * 60 * 1000, // 5 min
      numRuns: 500
    }
  : {
      timeout: 30 * 1000, // 30 sec
      numRuns: 50
    };

describe("Network", () => {
  describe("for arbitrary batches of blocks from an arbitrary set of arbitrarily forked blockchains", () => {
    jest.setTimeout(testConfig.timeout);
    let run = 0;

    testProp(
      `saves network genealogies so that @truffle/db correctly reports known latest descendant networks (numRuns: ${testConfig.numRuns})`,
      [
        Arbitrary.Networks().chain(model =>
          fc.record({
            model: fc.constant(model),
            batches: Arbitrary.Batches(model)
          })
        ),
        fc.boolean()
      ],
      async ({ model, batches }, disableIndex) => {
        debug.extend("run")("run #%o", run++);
        const db = await setup({
          identifier: "test:network:property:latestDescendants"
        });

        // iterate over each batch
        for (const batch of batches) {
          debug("starting batch");

          const { descendantIndex } = batch;
          const name = model.networks[descendantIndex].name;

          debug("connecting with mocked provider");
          const provider = mockProvider({ model, batch });
          const network = await Network.initialize({
            db,
            provider,
            network: {
              name
            },
            settings: {
              skipKnownLatest: true
            }
          });

          debug("loading networks");
          await network.includeBlocks({
            blocks: batch.inputs.map(({ historicBlock }) => historicBlock),
            settings: {
              disableIndex
            }
          });
        }

        // compute expected
        const { expectedLatestDescendants } = plan({ model, batches });
        debug("expectedLatestDescendants %O", expectedLatestDescendants);

        const {
          data: { networks }
        } = (await db.execute(
          gql`
            query {
              networks {
                id
                historicBlock {
                  height
                }
                descendants(includeSelf: true, onlyLatest: true) {
                  id
                }
              }
            }
          `,
          {}
        )) as { data: Query<"networks"> };
        debug("networks %O", networks);

        const ids = new Set(
          networks
            .filter(({ descendants }) => descendants.length > 0)
            .map(({ descendants: [latestDescendant] }) => latestDescendant.id)
        );
        debug("ids %O", ids);

        expect(ids).toEqual(
          new Set(expectedLatestDescendants.map(({ id }) => id))
        );
      },

      {
        numRuns: testConfig.numRuns,
        interruptAfterTimeLimit: testConfig.timeout * 0.8 // leave padding
      }
    );
  });
});

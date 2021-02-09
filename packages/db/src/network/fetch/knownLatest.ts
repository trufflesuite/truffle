/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:fetch:knownLatest");

import gql from "graphql-tag";

import type { Resource, Input, IdObject } from "@truffle/db/resources";
import { resources, Process } from "@truffle/db/process";
import * as FetchBlock from "./block";

let fragmentIndex = 0;

/**
 * Query for latest descendants of a given network and match against what's
 * on chain.
 */
export function* process<
  Network extends Pick<Resource<"networks">, "id" | keyof Input<"networks">>
>(options: { network: IdObject<"networks"> }): Process<Network | undefined> {
  const {
    network: { id }
  } = options;

  const resource = yield* resources.get(
    "networks",
    id,
    gql`
    fragment LatestDescendants__${fragmentIndex++} on Network {
      id
      name
      networkId
      historicBlock {
        height
        hash
      }
      descendants(
        includeSelf: true
        onlyLatest: true
      ) {
        id
        name
        networkId
        historicBlock {
          height
          hash
        }
      }
    }
  `
  );
  if (!resource) {
    return;
  }
  const { descendants, ...network } = resource;
  debug("descendants %O", descendants);

  for (const descendant of descendants.reverse()) {
    const { historicBlock } = descendant;
    const block = yield* FetchBlock.process({
      block: {
        height: historicBlock.height
      }
    });

    if (block && block.hash === historicBlock.hash) {
      // @ts-ignore
      return descendant;
    }
  }

  // @ts-ignore
  return network;
}

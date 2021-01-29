import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:definitions");

import { Collections, CollectionName } from "./collections";
import * as Graph from "./graph";
import * as Pouch from "./pouch";
import * as Process from "./process";

/**
 * Definitions type for whole meta system
 *
 * @category Definitions
 */
export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: Definition<C, N>;
  // [N in CollectionName<C>]: Graph.Definition<C, N> &
  //   Process.Definition<C, N> &
  //   Pouch.Definition<C, N>;
};

/**
 * Main Definition type for whole meta system
 *
 * Each definition for a given [[CollectionName]] must adhere to the
 * [[Graph.Definition]], [[Pouch.Definition]], and [[Process.Definition]]
 * definition type for that name.
 *
 * @category Definitions
 */
export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Graph.Definition<C, N> &
  Process.Definition<C, N> &
  Pouch.Definition<C, N>;
// > = Definitions<C>[N];

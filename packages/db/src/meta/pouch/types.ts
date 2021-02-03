import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:types");

import PouchDB from "pouchdb";

import type { Collections, CollectionName } from "@truffle/db/meta/collections";
import type * as Id from "@truffle/db/meta/id";

/**
 * @category Definitions
 */
export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: Definition<C, N>;
};

/**
 * @category Definitions
 */
export type Definition<C extends Collections, N extends CollectionName<C>> = {
  createIndexes: PouchDB.Find.CreateIndexOptions["index"][];
} & Id.Definition<C, N>;

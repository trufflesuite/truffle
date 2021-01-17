import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:types");

import PouchDB from "pouchdb";

import { Collections, CollectionName } from "@truffle/db/meta/collections";

/**
 * @category Definitions
 */
export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: Definition<C, N>;
};

/**
 * @category Definitions
 */
export type Definition<
  _C extends Collections,
  _N extends CollectionName<_C>
> = {
  createIndexes: PouchDB.Find.CreateIndexOptions["index"][];
  idFields: string[];
};

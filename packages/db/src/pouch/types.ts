import { logger } from "@truffle/db/logger";
const debug = logger("db:pouch:types");

import type PouchDB from "pouchdb";

import { CollectionName, Collections } from "@truffle/db/meta";

export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: {
    createIndexes: PouchDB.Find.CreateIndexOptions["index"][];
    idFields: string[];
  };
};

export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Definitions<C>[N];

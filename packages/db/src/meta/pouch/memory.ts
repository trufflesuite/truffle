import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:memory");

import PouchDB from "pouchdb";
import PouchDBMemoryAdapter from "pouchdb-adapter-memory";

import { Collections } from "@truffle/db/meta/collections";
import { Databases } from "./databases";

export class MemoryDatabases<C extends Collections> extends Databases<C> {
  static counter: number = 0;

  setup(options) {
    PouchDB.plugin(PouchDBMemoryAdapter);

    super.setup(options);
  }

  createDatabase(collectionName) {
    // HACK PouchDB seems to keep memory around even when we do .close()
    // instead: just give each database a unique name
    const databaseName = `${collectionName}__${MemoryDatabases.counter++}`;

    return new PouchDB(databaseName, { adapter: "memory" });
  }
}

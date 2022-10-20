import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:adapters:memory");

import PouchDB from "pouchdb";
import PouchDBMemoryAdapter from "pouchdb-adapter-memory";

import type { Collections } from "@truffle/db/meta/collections";
import type { GetDefaultSettings } from "./types";
import * as Base from "./base";

export interface DatabasesSettings {}

export const getDefaultSettings: GetDefaultSettings = () => ({});

export class Databases<C extends Collections> extends Base.Databases<C> {
  static counter: number = 0;

  override setup(settings: DatabasesSettings) {
    PouchDB.plugin(PouchDBMemoryAdapter);

    super.setup(settings);
  }

  createDatabase(collectionName) {
    // HACK PouchDB seems to keep memory around even when we do .close()
    // instead: just give each database a unique name
    const databaseName = `${collectionName}__${Databases.counter++}`;

    return new PouchDB(databaseName, { adapter: "memory" });
  }
}

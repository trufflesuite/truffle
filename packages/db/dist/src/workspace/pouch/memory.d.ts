/// <reference types="pouchdb-find" />
/// <reference types="pouchdb-core" />
/// <reference types="pouchdb-mapreduce" />
/// <reference types="pouchdb-replication" />
import { Databases } from "./databases";
import { Collections } from "./types";
export declare class MemoryDatabases<C extends Collections> extends Databases<
  C
> {
  static counter: number;
  setup(options: any): void;
  createDatabase(collectionName: any): PouchDB.Database<{}>;
}

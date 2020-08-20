/// <reference types="pouchdb-find" />
/// <reference types="pouchdb-core" />
/// <reference types="pouchdb-mapreduce" />
/// <reference types="pouchdb-replication" />
import { Databases } from "./databases";
import { Collections } from "./types";
export declare class SqliteDatabases<C extends Collections> extends Databases<
  C
> {
  private directory;
  setup(options: any): void;
  createDatabase(resource: any): PouchDB.Database<{}>;
}

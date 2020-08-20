/// <reference types="pouchdb-find" />
/// <reference types="pouchdb-core" />
/// <reference types="pouchdb-mapreduce" />
/// <reference types="pouchdb-replication" />
import { Collections } from "./types";
import { Databases } from "./databases";
export declare class FSDatabases<C extends Collections> extends Databases<C> {
  private directory;
  setup(options: any): void;
  createDatabase(resource: any): PouchDB.Database<{}>;
  jsondownpouch(opts: any, callback: any): any;
}

import path from "path";
import fse from "fs-extra";
import PouchDB from "pouchdb";
import PouchDBNodeWebSQLAdapter from "pouchdb-adapter-node-websql";

import { Collections } from "@truffle/db/meta";
import { AbstractDatabases } from "./databases";

export class SqliteDatabases<C extends Collections> extends AbstractDatabases<
  C
> {
  private directory: string;

  setup(options) {
    this.directory = options.settings.directory;
    fse.ensureDir(this.directory);

    PouchDB.plugin(PouchDBNodeWebSQLAdapter);
  }

  createDatabase(resource) {
    const savePath = path.resolve(this.directory, resource);
    return new PouchDB(savePath, { adapter: "websql" });
  }
}

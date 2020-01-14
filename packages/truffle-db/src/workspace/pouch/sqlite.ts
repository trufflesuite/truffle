import path from "path";
import fse from "fs-extra";
import PouchDB from "pouchdb";
import PouchDBNodeWebSQLAdapter from "pouchdb-adapter-node-websql";

import {
  Databases,
  MutationMapping,
  ResourceMapping,
  WorkspaceDatabasesOptions
} from "./types";

export class SqliteDatabases<
  R,
  C,
  M,
  CR extends ResourceMapping<R, C>,
  CM extends MutationMapping<C, M>
> extends Databases<R, C, M, CR, CM> {
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

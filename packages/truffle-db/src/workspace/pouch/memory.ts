import PouchDB from "pouchdb";
import PouchDBMemoryAdapter from "pouchdb-adapter-memory";

import {
  Databases,
  MutationMapping,
  ResourceMapping,
  WorkspaceDatabasesOptions
} from "./types";

export class MemoryDatabases<
  R,
  C,
  M,
  CR extends ResourceMapping<R, C>,
  CM extends MutationMapping<C, M>
> extends Databases<R, C, M, CR, CM> {
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

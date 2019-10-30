import path from "path";

import * as graphql from "graphql";

import { Workspace, schema } from "truffle-db/workspace";

export { generateId } from "truffle-db/helpers";

import tmp from "tmp";

export const fixturesDirectory = path.join(
  __dirname, // truffle-db/src/db/test
  "..", // truffle-db/src/db
  "..", // truffle-db/src/
  "..", // truffle-db/
  "test",
  "fixtures"
);

const tempDir = tmp.dirSync({ unsafeCleanup: true });
tmp.setGracefulCleanup();

export class WorkspaceClient {
  // two workspaces are generated here, one is empty for adding data, and one is queried using
  // the data that should have been persisted in the .db directory when data was added
  private workspace: Workspace;
  private persistedWorkspace: Workspace;

  constructor () {
    this.workspace = new Workspace(tempDir.name);
    this.persistedWorkspace = new Workspace(tempDir.name);
  }

  async execute (request, variables = {}, persisted = false) {
    const result = await graphql.execute(
      schema,
      request,
      null, // root object, managed by workspace
      { workspace: persisted ? this.persistedWorkspace : this.workspace }, // context vars
      variables
    );
    return result.data;
  }
}

export const Migrations = require(path.join(fixturesDirectory, "Migrations.json"));

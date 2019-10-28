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
  private workspace: Workspace;
  private persistedWorkspace: Workspace;

  constructor () {
    this.workspace = new Workspace(tempDir.name);
    this.persistedWorkspace = new Workspace(tempDir.name);
  }

  async execute (request, variables = {}) {
    const result = await graphql.execute(
      schema,
      request,
      null, // root object, managed by workspace
      { workspace: this.workspace }, // context vars
      variables
    );
    return result.data;
  }

  async executePersisted (request, variables = {}) {
    const result = await graphql.execute(
      schema,
      request,
      null, // root object, managed by workspace
      { workspace: this.persistedWorkspace }, // context vars
      variables
    );

    return result.data;
  }
}

export const Migrations = require(path.join(fixturesDirectory, "Migrations.json"));

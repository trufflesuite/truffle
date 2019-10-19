import path from "path";

import * as graphql from "graphql";

import { Workspace, schema } from "truffle-db/workspace";

export { generateId } from "truffle-db/helpers";


export const fixturesDirectory = path.join(
  __dirname, // truffle-db/src/db/test
  "..", // truffle-db/src/db
  "..", // truffle-db/src/
  "..", // truffle-db/
  "test",
  "fixtures"
);

export class WorkspaceClient {
  private workspace: Workspace;

  constructor () {
    this.workspace = new Workspace();
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
}

export const Migrations = require(path.join(fixturesDirectory, "Migrations.json"));

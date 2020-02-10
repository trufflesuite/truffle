import path from "path";

import * as graphql from "graphql";

import { Workspace, schema } from "db/workspace";

export { generateId } from "db/helpers";

import tmp from "tmp";
import * as fse from "fs-extra";

export const fixturesDirectory = path.join(
  __dirname, // db/src/db/test
  "..", // db/src/db
  "..", // db/src/
  "..", // db/
  "test",
  "fixtures"
);

const tempDir = tmp.dirSync({ unsafeCleanup: true });
tmp.setGracefulCleanup();

export class WorkspaceClient {
  private workspace: Workspace;

  constructor() {
    this.workspace = new Workspace({
      workingDirectory: tempDir.name
    });
  }

  async execute(request, variables = {}) {
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

export const Migrations = require(path.join(
  fixturesDirectory,
  "Migrations.json"
));

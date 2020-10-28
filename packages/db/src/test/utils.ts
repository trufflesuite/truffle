import path from "path";

import * as graphql from "graphql";

import { schema } from "@truffle/db/schema";
import { connect } from "@truffle/db/connect";
import { Workspace } from "@truffle/db/definitions";

export { generateId } from "@truffle/db/helpers";

import tmp from "tmp";

export const fixturesDirectory = path.join(
  __dirname, // db/src/test
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
    this.workspace = connect({
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

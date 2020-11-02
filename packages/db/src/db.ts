import { logger } from "@truffle/db/logger";
const debug = logger("db:db");

import { GraphQLSchema, DocumentNode, parse, execute } from "graphql";
import type TruffleConfig from "@truffle/config";
import { schema } from "./schema";
import { connect } from "./connect";
import { Context } from "./definitions";

export class TruffleDB {
  schema: GraphQLSchema;
  private context: Context;

  constructor(config: TruffleConfig) {
    this.schema = schema;
    this.context = this.createContext(config);
  }

  async query(query: DocumentNode | string, variables: any = {}): Promise<any> {
    const document: DocumentNode =
      typeof query !== "string" ? query : parse(query);

    const response = await execute(
      this.schema,
      document,
      null,
      this.context,
      variables
    );

    if (response.errors) {
      debug("errors %o", response.errors);
    }

    return response;
  }

  private createContext(config: TruffleConfig): Context {
    return {
      workspace: connect({
        workingDirectory: config.working_directory,
        adapter: (config.db || {}).adapter
      }),
      workingDirectory: config.working_directory || process.cwd()
    };
  }
}

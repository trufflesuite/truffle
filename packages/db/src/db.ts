import { logger } from "@truffle/db/logger";
const debug = logger("db:db");

import { GraphQLSchema, DocumentNode, parse, execute } from "graphql";
import type TruffleConfig from "@truffle/config";
import { schema } from "./schema";
import { attach } from "./workspace";
import { Context } from "./resources";

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

    return await execute(this.schema, document, null, this.context, variables);
  }

  private createContext(config: TruffleConfig): Context {
    return {
      workspace: attach({
        workingDirectory: config.working_directory,
        adapter: (config.db || {}).adapter
      })
    };
  }
}

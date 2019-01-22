import { graphql, GraphQLSchema } from "graphql";
import { schema } from "truffle-db/data";

import { PouchConnector } from "truffle-db/pouch/db";

interface IConfig {
  contracts_build_directory: string,
  working_directory?: string
}

interface IContext {
  artifactsDirectory: string,
  workingDirectory: string,
  workspace: PouchConnector
}

export class TruffleDB {
  schema: GraphQLSchema;
  context: IContext;

  constructor (config: IConfig) {
    this.context = TruffleDB.createContext(config);
    this.schema = schema;
  }

  async query (query: string, variables: any): Promise<any> {
    return await graphql(this.schema, query, null, this.context, variables);
  }

  static createContext(config: IConfig): IContext {
    return {
      workspace: new PouchConnector(),
      artifactsDirectory: config.contracts_build_directory,
      workingDirectory: config.working_directory || process.cwd()
    }
  }
}

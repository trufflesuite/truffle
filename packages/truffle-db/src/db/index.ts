import { graphql, GraphQLSchema } from "graphql";
import { schema } from "truffle-db/data";

interface IConfig {
  contracts_build_directory: string,
  working_directory?: string
}

interface IContext {
  artifactsDirectory: string,
  workingDirectory: string
}

export class TruffleDB {
  schema: GraphQLSchema;
  context: IContext;

  constructor (config: IConfig) {
    this.context = TruffleDB.createContext(config);
    this.schema = schema;
  }

  static createContext(config: IConfig): IContext {
    return {
      artifactsDirectory: config.contracts_build_directory,
      workingDirectory: config.working_directory || process.cwd()
    }
  }

  async query (query: string): Promise<any> {
    return await graphql(schema, query);
  }
}

import {
  GraphQLSchema,
  DocumentNode,
  parse,
  execute
} from "graphql";

import { schema } from "truffle-db/data";

import { Workspace } from "truffle-db/workspace";

interface IConfig {
  contracts_build_directory: string,
  contracts_directory: string,
  working_directory?: string
}

interface IContext {
  artifactsDirectory: string,
  workingDirectory: string,
  contractsDirectory: string,
  workspace: Workspace,
  db: ITruffleDB
}

interface ITruffleDB {
  query: (query: DocumentNode | string,
    variables: any) =>
    Promise<any>
}

export class TruffleDB {
  schema: GraphQLSchema;
  context: IContext;

  constructor (config: IConfig) {
    this.context = this.createContext(config);
    this.schema = schema;
  }

  async query (
    query: DocumentNode | string,
    variables: any = {}
  ):
    Promise<any>
  {
    const document: DocumentNode =
      (typeof query !== "string")
        ? query
        : parse(query);

    return await execute(
      this.schema, document, null, this.context, variables
    );
  }

  createContext(config: IConfig): IContext {
    return {
      workspace: new Workspace(config.working_directory),
      artifactsDirectory: config.contracts_build_directory,
      workingDirectory: config.working_directory || process.cwd(),
      contractsDirectory: config.contracts_directory,
      db: this
    }
  }
}

import { GraphQLSchema, DocumentNode } from "graphql";
import { WorkflowCompileResult } from "@truffle/db/loaders/types";
import { Workspace } from "@truffle/db/workspace";
interface IConfig {
  contracts_build_directory: string;
  contracts_directory: string;
  working_directory?: string;
  db?: {
    adapter?: {
      name: string;
      settings?: any;
    };
  };
}
interface IContext {
  artifactsDirectory: string;
  workingDirectory: string;
  contractsDirectory: string;
  workspace: Workspace;
  db: ITruffleDB;
}
interface ITruffleDB {
  query: (query: DocumentNode | string, variables: any) => Promise<any>;
}
export declare class TruffleDB {
  schema: GraphQLSchema;
  context: IContext;
  constructor(config: IConfig);
  query(query: DocumentNode | string, variables?: any): Promise<any>;
  loadCompilations(result: WorkflowCompileResult): Promise<any>;
  createContext(config: IConfig): IContext;
}
export {};

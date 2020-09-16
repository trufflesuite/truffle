import { GraphQLSchema, DocumentNode, parse, execute } from "graphql";
import { schema } from "@truffle/db/data";
import { generateCompileLoad } from "@truffle/db/loaders/commands";
import { WorkspaceRequest } from "@truffle/db/loaders/types";
import { WorkflowCompileResult } from "@truffle/compile-common";
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

export class TruffleDB {
  schema: GraphQLSchema;
  context: IContext;

  constructor(config: IConfig) {
    this.context = this.createContext(config);
    this.schema = schema;
  }

  async query(query: DocumentNode | string, variables: any = {}): Promise<any> {
    const document: DocumentNode =
      typeof query !== "string" ? query : parse(query);

    return await execute(this.schema, document, null, this.context, variables);
  }

  async loadNames(
    project: DataModel.IProject,
    contractsByCompilation: Array<DataModel.IContract[]>
  ) {
    const namesLoader = generateNamesLoad(project, contractsByCompilation);
    let curNames = namesLoader.next();
    while (!curNames.done) {
      curNames = namesLoader.next();
    }
  }

  async loadCompilations(result: WorkflowCompileResult, names: boolean) {
    const saga = generateCompileLoad(result, {
      directory: this.context.workingDirectory
    });

    let cur = saga.next();

    while (!cur.done) {
      // HACK not sure why this is necessary; TS knows we're not done, so
      // cur.value should only be WorkspaceRequest (first Generator param),
      // not the return value (second Generator param)
      const {
        request,
        variables
      }: WorkspaceRequest = cur.value as WorkspaceRequest;
      const response = await this.query(request, variables);

      cur = saga.next(response);
    }

    if (names === true) {
      this.loadNames(cur.value.project, cur.value.contractsByCompilation);
    }

    return cur.value;
  }

  createContext(config: IConfig): IContext {
    return {
      workspace: new Workspace({
        workingDirectory: config.working_directory,
        adapter: (config.db || {}).adapter
      }),
      artifactsDirectory: config.contracts_build_directory,
      workingDirectory: config.working_directory || process.cwd(),
      contractsDirectory: config.contracts_directory,
      db: this
    };
  }
}

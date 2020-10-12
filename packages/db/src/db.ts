import { GraphQLSchema, DocumentNode, parse, execute } from "graphql";
import { schema } from "@truffle/db/data";
import { generateCompileLoad } from "@truffle/db/loaders/commands";
import {
  WorkspaceRequest,
  WorkspaceResponse,
  toIdObject
} from "@truffle/db/loaders/types";
import { WorkflowCompileResult } from "@truffle/compile-common";
import { Workspace } from "@truffle/db/workspace";
import {
  generateInitializeLoad,
  generateNamesLoad
} from "@truffle/db/loaders/commands";

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

type LoaderOptions = {
  names: boolean;
};

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

  async getWorkspaceResponse(generatorRequest: WorkspaceRequest) {
    const { request, variables }: WorkspaceRequest = generatorRequest;

    const response: WorkspaceResponse = await this.query(request, variables);

    return response;
  }

  async loadNames(
    project: DataModel.IProject,
    contractsByCompilation: Array<DataModel.IContract[]>
  ) {
    const namesLoader = generateNamesLoad(
      toIdObject(project),
      contractsByCompilation
    );
    let curNames = namesLoader.next();

    while (!curNames.done) {
      const namesResponse = await this.getWorkspaceResponse(curNames.value);
      curNames = namesLoader.next(namesResponse);
    }
  }

  async loadProject(): Promise<DataModel.IProject> {
    const projectRequest = generateInitializeLoad({
      directory: this.context.workingDirectory
    }).next();

    const response = await this.getWorkspaceResponse(projectRequest.value);
    const projectResponse = response.data.workspace.projectsAdd.projects[0];

    return projectResponse;
  }

  async loadCompilations(
    project: DataModel.IProject,
    result: WorkflowCompileResult,
    options: LoaderOptions
  ) {
    const saga = generateCompileLoad(result);

    let cur = saga.next();

    while (!cur.done) {
      // HACK not sure why this is necessary; TS knows we're not done, so
      // cur.value should only be WorkspaceRequest (first Generator param),
      // not the return value (second Generator param)
      const response = await this.getWorkspaceResponse(cur.value);
      cur = saga.next(response);
    }

    if (options && options.names === true) {
      await this.loadNames(project, cur.value.contractsByCompilation);
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

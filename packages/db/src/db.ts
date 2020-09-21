import { GraphQLSchema, DocumentNode, parse, execute } from "graphql";

import { schema } from "@truffle/db/data";
import {
  generateCompileLoad,
  generateNamesLoad
} from "@truffle/db/loaders/commands";
import {
  WorkflowCompileResult,
  WorkspaceRequest,
  WorkspaceResponse,
  toIdObject
} from "@truffle/db/loaders/types";
import { Workspace } from "@truffle/db/workspace";
import { projectLoadGenerate } from "@truffle/db/loaders/commands";

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
    const namesLoader = generateNamesLoad(
      toIdObject(project),
      contractsByCompilation
    );
    let curNames = namesLoader.next();

    while (!curNames.done) {
      const {
        request,
        variables
      }: WorkspaceRequest = curNames.value as WorkspaceRequest;
      const namesResponse: WorkspaceResponse = await this.query(
        request,
        variables
      );

      curNames = namesLoader.next(namesResponse);
    }
  }

  async loadProject(): Promise<DataModel.IProject> {
    const projectRequest = projectLoadGenerate({
      directory: this.context.workingDirectory
    }).next();

    // this gets the response using that request, the project
    const {
      request,
      variables
    }: WorkspaceRequest = projectRequest.value as WorkspaceRequest;
    const response = await this.query(request, variables);
    const projectResponse = response.data.workspace.projectsAdd.projects[0];

    return projectResponse;
  }

  async loadCompilations(
    project: DataModel.IProject,
    result: WorkflowCompileResult,
    names: boolean
  ) {
    const saga = generateCompileLoad(result);

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

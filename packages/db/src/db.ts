import { GraphQLSchema, DocumentNode, parse, execute } from "graphql";
import { schema } from "@truffle/db/workspace/schema";
import { generateCompileLoad } from "@truffle/db/loaders/commands";
import { WorkspaceRequest, WorkspaceResponse } from "@truffle/db/loaders/types";
import { WorkflowCompileResult } from "@truffle/compile-common";
import { Workspace } from "@truffle/db/workspace";
import {
  generateInitializeLoad,
  generateNamesLoad
} from "@truffle/db/loaders/commands";
import { toIdObject, NamedResource } from "@truffle/db/meta";

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

  private async runLoader<
    Request extends WorkspaceRequest,
    Response extends WorkspaceResponse,
    Args extends unknown[],
    Return
  >(
    loader: (...args: Args) => Generator<Request, Return, Response>,
    ...args: Args
  ): Promise<Return> {
    const saga = loader(...args);
    let current = saga.next();

    while (!current.done) {
      const { request, variables } = current.value as Request;

      const response: Response = await this.query(request, variables);

      current = saga.next(response);
    }

    return current.value;
  }

  async loadNames(project: DataModel.IProject, resources: NamedResource[]) {
    return await this.runLoader(
      generateNamesLoad,
      toIdObject(project),
      resources
    );
  }

  async loadProject(): Promise<DataModel.IProject> {
    return await this.runLoader(generateInitializeLoad, {
      directory: this.context.workingDirectory
    });
  }

  async loadCompilations(
    result: WorkflowCompileResult,
    options: LoaderOptions
  ) {
    const project = await this.loadProject();

    const { compilations, contracts } = await this.runLoader(
      generateCompileLoad,
      result
    );

    if (options.names === true) {
      await this.loadNames(project, contracts);
    }

    return { compilations, contracts };
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

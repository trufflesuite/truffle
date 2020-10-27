import { logger } from "@truffle/db/logger";
const debug = logger("db:db");

import { GraphQLSchema, DocumentNode, parse, execute } from "graphql";
import type TruffleConfig from "@truffle/config";
import { generateCompileLoad } from "@truffle/db/loaders/commands";
import { LoaderRunner, forDb } from "@truffle/db/loaders/run";
import { WorkflowCompileResult } from "@truffle/compile-common";
import { schema } from "./schema";
import { connect } from "./connect";
import { Context } from "./definitions";
import {
  generateInitializeLoad,
  generateNamesLoad
} from "@truffle/db/loaders/commands";
import { toIdObject, NamedResource } from "@truffle/db/meta";

type LoaderOptions = {
  names: boolean;
};

export class TruffleDB {
  schema: GraphQLSchema;
  private context: Context;
  private runLoader: LoaderRunner;

  constructor(config: TruffleConfig) {
    this.schema = schema;
    this.context = this.createContext(config);
    this.runLoader = forDb(this);
  }

  async query(query: DocumentNode | string, variables: any = {}): Promise<any> {
    const document: DocumentNode =
      typeof query !== "string" ? query : parse(query);

    return await execute(this.schema, document, null, this.context, variables);
  }

  async loadNames(project: DataModel.Project, resources: NamedResource[]) {
    return await this.runLoader(
      generateNamesLoad,
      toIdObject(project),
      resources
    );
  }

  async loadProject(): Promise<DataModel.Project> {
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

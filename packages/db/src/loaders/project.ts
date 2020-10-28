import {DocumentNode} from "graphql";
import type {Provider} from "web3/providers";
import {WorkflowCompileResult} from "@truffle/compile-common";

import {toIdObject, IdObject} from "@truffle/db/meta";

import {
  generateCompileLoad,
  generateInitializeLoad,
  generateNamesLoad
} from "./commands";

import {LoaderRunner, forDb} from "./run";

interface ITruffleDB {
  query: (query: DocumentNode | string, variables: any) => Promise<any>;
}

export interface InitializeOptions {
  project: DataModel.ProjectInput;
  db: ITruffleDB;
}

export class Project {
  protected run: LoaderRunner;
  private forProvider: (provider: Provider) => { run: LoaderRunner };
  private project: IdObject<DataModel.Project>;

  static async initialize(options: InitializeOptions): Promise<Project> {
    const {db, project: input} = options;

    const { run, forProvider } = forDb(db);

    const project = await run(generateInitializeLoad, input);

    return new Project({run, forProvider, project});
  }

  async connect(options: {
    provider: Provider
  }): Promise<LiveProject> {
    const { run } = this.forProvider(options.provider);

    return new LiveProject({
      run,
      project: this.project
    });
  }

  async loadCompilations(options: {
    result: WorkflowCompileResult;
  }): Promise<{
    compilations: IdObject<DataModel.Compilation>[];
    contracts: IdObject<DataModel.Contract>[];
  }> {
    const {result} = options;

    const {compilations, contracts} = await this.run(
      generateCompileLoad,
      result
    );

    return {
      compilations: compilations.map(toIdObject),
      contracts: contracts.map(toIdObject)
    };
  }

  async loadNames(options: {
    assignments: {
      [collectionName: string]: IdObject[];
    };
  }): Promise<{
    nameRecords: IdObject<DataModel.NameRecord>[];
  }> {
    const nameRecords = await this.run(
      generateNamesLoad,
      this.project,
      options.assignments
    );
    return {
      nameRecords: nameRecords.map(toIdObject)
    };
  }

  protected constructor(options: {
    project: IdObject<DataModel.Project>;
    run: LoaderRunner;
    forProvider?: (provider: Provider) => { run: LoaderRunner }
  }) {
    this.project = options.project;
    this.run = options.run;
    if (options.forProvider) {
      this.forProvider = options.forProvider;
    }
  }
}

export class LiveProject extends Project {

}

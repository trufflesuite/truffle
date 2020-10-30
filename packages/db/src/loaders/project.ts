import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:project");

import {DocumentNode} from "graphql";
import type {Provider} from "web3/providers";
import {WorkflowCompileResult} from "@truffle/compile-common";
import {ContractObject} from "@truffle/contract-schema/spec";

import {toIdObject, IdObject} from "@truffle/db/meta";

import {
  generateCompileLoad,
  generateInitializeLoad,
  generateNamesLoad,
  generateMigrateLoad
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
    contracts: IdObject<DataModel.Contract>[];
  }> {
    const {result} = options;

    const {contracts} = await this.run(generateCompileLoad, result);

    return {
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
  async loadMigration(options: {
    network: Omit<DataModel.NetworkInput, "networkId" | "historicBlock">;
    artifacts: ContractObject[];
  }): Promise<{
    network: IdObject<DataModel.Network>,
    contractInstances: IdObject<DataModel.ContractInstance>[]
  }> {
    const {
      network,
      contractInstances
    } = await this.run(generateMigrateLoad, options);

    return { network, contractInstances };
  }
}

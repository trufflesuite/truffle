import { logger } from "@truffle/db/logger";
const debug = logger("db:project:test:artifacts");

import gql from "graphql-tag";
import Config from "@truffle/config";
import TruffleResolver from "@truffle/resolver";
import type { Resolver } from "@truffle/resolver";
import { Environment } from "@truffle/environment";
import { ContractObject } from "@truffle/contract-schema/spec";

import { Project } from "@truffle/db/project";
import { Resource, Db, IdObject, toIdObject } from "@truffle/db/resources";
import { resources } from "@truffle/db/process";
import { WorkflowCompileResult } from "@truffle/compile-common/src/types";
import WorkflowCompile from "@truffle/workflow-compile";

export class ArtifactsLoader {
  private db: Db;
  private compilationConfig: Partial<Config>;
  private resolver: Resolver;

  constructor(db: Db, config?: Partial<Config>) {
    this.db = db;
    this.compilationConfig = config;
    // @ts-ignore
    this.resolver = new TruffleResolver(config);
  }

  async load(): Promise<void> {
    debug("Compiling...");
    const result: WorkflowCompileResult = await WorkflowCompile.compile(
      this.compilationConfig
    );
    debug("Compiled.");

    debug("Initializing project...");
    const project = await Project.initialize({
      project: {
        directory: this.compilationConfig.working_directory
      },
      db: this.db
    });
    debug("Initialized project.");

    debug("Loading compilations...");
    const loadedResult = await project.loadCompile({ result });
    debug("Loaded compilations.");

    const contracts = loadedResult.contracts.map(
      ({ db: { contract } }) => contract
    );

    debug("Assigning contract names...");
    await project.assignNames({ assignments: { contracts } });
    debug("Assigned contract names.");

    const artifacts = await this.collectArtifacts(project, contracts);

    const config = Config.detect({
      working_directory: this.compilationConfig["contracts_directory"]
    });

    debug("Loading networks...");
    const networks = [];
    for (const name of Object.keys(config.networks)) {
      try {
        debug("Connecting to network name: %s", name);
        config.network = name;
        await Environment.detect(config);

        const result = await project
          .connect({ provider: config.provider })
          .loadMigrate({
            network: { name },
            artifacts
          });

        networks.push(result.network);
      } catch (error) {
        debug("error %o", error);
        continue;
      }
    }
    debug("Loaded networks.");

    debug("Assigning network names...");
    await project.assignNames({ assignments: { networks } });
    debug("Assigned network names.");
  }

  private async collectArtifacts(
    project: Project,
    contractIdObjects: IdObject<"contracts">[]
  ): Promise<ContractObject[]> {
    const ids = contractIdObjects.map(({ id }) => id);

    // get full representation
    debug("Retrieving contracts, ids: %o...", ids);
    const contracts = await project.run(
      resources.find,
      "contracts",
      ids,
      gql`
        fragment ContractNameAndBytecodes on Contract {
          id
          name
          callBytecode {
            id
          }
          createBytecode {
            id
          }
        }
      `
    );

    // and resolve artifact
    return contracts.map((contract: Resource<"contracts">) => {
      const { name, callBytecode, createBytecode } = contract;

      debug("Requiring artifact for %s...", name);
      // @ts-ignore
      const artifact: ContractObject = this.resolver.require(name)._json;
      debug("Required artifact for %s.", name);

      artifact.db = {
        contract: toIdObject(contract),
        callBytecode: toIdObject(callBytecode),
        createBytecode: toIdObject(createBytecode)
      };

      return artifact;
    });
  }
}

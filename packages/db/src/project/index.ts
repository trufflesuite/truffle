import { logger } from "@truffle/db/logger";
const debug = logger("db:project");

import type { Provider } from "web3/providers";
import type { WorkflowCompileResult } from "@truffle/compile-common";
import type { ContractObject } from "@truffle/contract-schema/spec";

import * as Process from "@truffle/db/process";
import {
  Db,
  NamedCollectionName,
  Resource,
  Input,
  IdObject,
  toIdObject
} from "@truffle/db/resources";

import * as Network from "@truffle/db/network";

import * as Batch from "./batch";
export { Batch };

import * as Initialize from "./initialize";
import * as AssignNames from "./assignNames";
import * as LoadCompile from "./loadCompile";
import * as LoadMigrate from "./loadMigrate";
export * as Test from "./test";
export { Initialize, AssignNames, LoadCompile, LoadMigrate };

export type InitializeOptions = {
  project: Input<"projects">;
} & ({ db: Db } | ReturnType<typeof Process.Run.forDb>);

/**
 * Construct abstraction and idempotentally add a project resource
 *
 * @category Constructor
 */
export async function initialize(options: InitializeOptions): Promise<Project> {
  const { run, forProvider } =
    "db" in options ? Process.Run.forDb(options.db) : options;

  const { project: input } = options;

  const project = await run(Initialize.process, { input });

  return new Project({ run, forProvider, project });
}

/**
 * Abstraction for connecting @truffle/db to a Truffle project
 *
 * This class affords an interface between Truffle and @truffle/db,
 * specifically for the purposes of ingesting @truffle/workflow-compile results
 * and contract instance information from @truffle/contract-schema artifact
 * files.
 *
 * Unless you are building tools that work with Truffle's various packages
 * directly, you probably don't need to use this class.
 *
 * @example To instantiate this abstraction:
 * ```typescript
 * import { connect, Project } from "@truffle/db";
 *
 * const db = connect({
 *   // ...
 * });
 *
 * const project = await Project.initialize({
 *   db,
 *   project: {
 *     directory: "/path/to/project/dir"
 *   }
 * });
 * ```
 */
export class Project {
  public get id(): string {
    return this.project.id;
  }

  /**
   * Accept a compilation result and process it to save all relevant resources
   * ([[DataModel.Source | Source]], [[DataModel.Bytecode | Bytecode]],
   * [[DataModel.Compilation | Compilation]],
   * [[DataModel.Contract | Contract]])
   *
   * This returns the same WorkflowCompileResult but with additional
   * references to each of the added resources.
   *
   * @category Truffle-specific
   */
  async loadCompile(options: { result: WorkflowCompileResult }): Promise<{
    compilations: LoadCompile.Compilation[];
    contracts: LoadCompile.Contract[];
  }> {
    const { result } = options;

    return await this.run(LoadCompile.process, result);
  }

  /**
   * Update name pointers for this project. Currently affords name-keeping for
   * [[DataModel.Network | Network]] and [[DataModel.Contract | Contract]]
   * resources (e.g., naming [[DataModel.ContractInstance | ContractInstance]]
   * resources is not supported directly)
   *
   * This saves [[DataModel.NameRecord | NameRecord]] and
   * [[DataModel.ProjectName | ProjectName]] resources to @truffle/db.
   *
   * Returns a list of NameRecord resources for completeness, although these
   * may be regarded as an internal concern. ProjectName resources are not
   * returned because they are mutable; returned representations would be
   * impermanent.
   *
   * @typeParam N
   * Either `"contracts"`, `"networks"`, or `"contracts" | "networks"`.
   *
   * @param options.assignments
   * Object whose keys belong to the set of named collection names and whose
   * values are [[IdObject | IdObjects]] for resources of that collection.
   *
   * @example
   * ```typescript
   * await project.assignNames({
   *   assignments: {
   *     contracts: [
   *       { id: "<contract1-id>" },
   *       { id: "<contract2-id>" },
   *       // ...
   *     }
   *   }
   * });
   * ```
   */
  async assignNames<N extends NamedCollectionName>(options: {
    assignments: {
      [K in N]: IdObject<K>[];
    };
  }): Promise<{
    assignments: {
      [K in N]: IdObject<"nameRecords">[];
    };
  }> {
    const { assignments } = await this.run(AssignNames.process, {
      project: this.project,
      assignments: options.assignments
    });
    return {
      // @ts-ignore
      assignments: Object.entries(assignments)
        .map(([collectionName, assignments]) => ({
          [collectionName]: assignments.map(({ nameRecord }) => nameRecord)
        }))
        .reduce((a, b) => ({ ...a, ...b }), {})
    };
  }

  /**
   * Accept a provider to enable workflows that require communicating with the
   * underlying blockchain network.
   * @category Constructor
   */
  connect(options: { provider: Provider }): ConnectedProject {
    const { run } = this.forProvider(options.provider);

    return new ConnectedProject({
      run,
      project: this.project
    });
  }

  /**
   * Run a given [[Process.Processor | Processor]] with specified arguments.
   *
   * This method is a [[Meta.Process.ProcessorRunner | ProcessorRunner]] and
   * can be used to `await` (e.g.) the processors defined by
   * [[Process.resources | Process's `resources`]].
   *
   * @category Processor
   */
  async run<
    A extends unknown[],
    T = any,
    R extends Process.RequestType | undefined = undefined
  >(processor: Process.Processor<A, T, R>, ...args: A): Promise<T> {
    return this._run(processor, ...args);
  }

  /*
   * internals
   */

  /**
   * @hidden
   */
  private forProvider: (provider: Provider) => { run: Process.ProcessorRunner };
  /**
   * @hidden
   */
  private project: IdObject<"projects">;
  /**
   * @hidden
   */
  private _run: Process.ProcessorRunner;

  /**
   * @ignore
   */
  constructor(options: {
    project: IdObject<"projects">;
    run: Process.ProcessorRunner;
    forProvider?: (provider: Provider) => { run: Process.ProcessorRunner };
  }) {
    this.project = options.project;
    this._run = options.run;
    if (options.forProvider) {
      this.forProvider = options.forProvider;
    }
  }
}

export class ConnectedProject extends Project {
  /**
   * Process artifacts after a migration. Uses provider to determine most
   * relevant network information directly, but still requires
   * project-specific information about the network (i.e., name)
   *
   * This adds potentially multiple [[DataModel.Network | Network]] resources
   * to @truffle/db, creating individual networks for the historic blocks in
   * which each [[DataModel.ContractInstance | ContractInstance]] was first
   * created on-chain.
   *
   * This saves [[DataModel.Network | Network]] and
   * [[DataModel.ContractInstance | ContractInstance]] resources to
   * \@truffle/db.
   *
   * Returns `artifacts` with network objects populated with IDs for each
   * [[DataModel.ContractInstance | ContractInstance]], along with a
   * `network` object containing the ID of whichever
   * [[DataModel.Network | Network]] was added with the highest block height.
   * @category Truffle-specific
   */
  async loadMigrate(options: {
    network: Pick<Input<"networks">, "name">;
    artifacts: (ContractObject & {
      db: {
        contract: IdObject<"contracts">;
        callBytecode: IdObject<"bytecodes">;
        createBytecode: IdObject<"bytecodes">;
      };
    })[];
  }): Promise<{
    network: IdObject<"networks">;
    artifacts: LoadMigrate.Artifact[];
  }> {
    const network = await Network.initialize({
      network: options.network,
      run: (...args) => this.run(...args)
    });

    const { networkId } = network.genesis;

    const transactionHashes = options.artifacts.map(
      ({ networks = {} }) => (networks[networkId] || {}).transactionHash
    );

    const networks = await network.includeTransactions({ transactionHashes });

    // if there are any missing networks, fetch the latest as backup data
    if (networks.find((network): network is undefined => !network)) {
      await network.includeLatest();
    }

    const { artifacts } = await this.run(LoadMigrate.process, {
      network: {
        networkId: network.knownLatest.networkId
      },
      // @ts-ignore HACK to avoid making LoadMigrate.process generic
      artifacts: this.populateNetworks({
        artifacts: options.artifacts,
        knownLatest: network.knownLatest,
        networks
      })
    });

    return {
      network: toIdObject<"networks">(network.knownLatest),
      artifacts
    };
  }

  private populateNetworks<
    Artifact extends ContractObject & {
      db: {
        contract: IdObject<"contracts">;
        callBytecode: IdObject<"bytecodes">;
        createBytecode: IdObject<"bytecodes">;
      };
    }
  >(options: {
    knownLatest: Pick<Resource<"networks">, "id" | "networkId">;
    networks: (IdObject<"networks"> | undefined)[];
    artifacts: Artifact[];
  }): (Artifact & {
    networks?: {
      [networkId: string]: {
        db?: {
          network?: IdObject<"networks">;
        };
      };
    };
  })[] {
    const { knownLatest, networks, artifacts } = options;
    const { networkId } = knownLatest;

    return artifacts.map((artifact, index) => {
      const network = (artifact.networks || {})[networkId] || {};
      if (!network.address) {
        return artifact;
      }

      return {
        ...artifact,
        networks: {
          ...artifact.networks,
          [networkId]: {
            ...(artifact.networks || {})[networkId],
            db: {
              network: networks[index] || toIdObject(knownLatest)
            }
          }
        }
      };
    });
  }
}

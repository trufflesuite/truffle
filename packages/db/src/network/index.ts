import { logger } from "@truffle/db/logger";
const debug = logger("db:network");

import type { Provider } from "web3/providers";

import * as Process from "@truffle/db/process";
import type {
  Db,
  DataModel,
  Input,
  Resource,
  IdObject
} from "@truffle/db/resources";

import * as Initialize from "./initialize";
import * as FetchTransactionBlocks from "./transactionBlocks";
import * as AddNetworks from "./addNetworks";
import * as LoadNetworkGenealogies from "./networkGenealogies";
export {
  Initialize,
  FetchTransactionBlocks,
  AddNetworks,
  LoadNetworkGenealogies
};

type NetworkResource = Pick<
  Resource<"networks">,
  "id" | keyof Input<"networks">
>;

export type InitializeOptions = (
  | { db: Db; provider: Provider }
  | { run: Process.ProcessorRunner }
) & {
  network: Omit<Input<"networks">, "networkId" | "historicBlock">;
};

/**
 * Construct abstraction
 *
 * @category Constructor
 */
export async function initialize(options: InitializeOptions): Promise<Network> {
  const { run } =
    "db" in options && "provider" in options
      ? Process.Run.forDb(options.db).forProvider(options.provider)
      : options;

  const { network } = options;

  const genesis = await run(Initialize.process, { network });

  return new Network({
    genesis,
    run
  });
}

export class Network {
  get genesis(): NetworkResource {
    return this._genesis;
  }

  get congruentLatest(): NetworkResource {
    return this._latest;
  }

  async recordBlocks(options: {
    blocks: DataModel.Block[];
  }): Promise<(IdObject<"networks"> | undefined)[]> {
    const { blocks } = options;

    const networks = await this.run(AddNetworks.process, {
      network: {
        name: this._genesis.name,
        networkId: this._genesis.networkId
      },
      blocks
    });

    this._incongruent.push(
      ...networks.map(({ id }, index) => ({
        ...this._genesis,
        id,
        historicBlock: blocks[index]
      }))
    );

    return networks;
  }

  async recordTransactions(options: {
    transactionHashes: string[];
  }): Promise<(IdObject<"networks"> | undefined)[]> {
    const { transactionHashes } = options;

    const blocks = await this.run(
      FetchTransactionBlocks.process,
      transactionHashes
    );

    return await this.recordBlocks({ blocks });
  }

  async congrueGenealogy(
    options: {
      disableIndex?: boolean;
    } = {}
  ): Promise<void> {
    await this.run(LoadNetworkGenealogies.process, {
      networks: this._incongruent,
      disableIndex: options.disableIndex
    });

    this._latest = this._incongruent.reduce(
      (latest, network) =>
        network.historicBlock.height > latest.historicBlock.height
          ? network
          : latest,
      this._latest
    );

    this._incongruent = [];
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
  private _incongruent: NetworkResource[];
  /**
   * @hidden
   */
  private _genesis: NetworkResource;
  /**
   * @hidden
   */
  private _latest: NetworkResource;
  /**
   * @hidden
   */
  private _run: Process.ProcessorRunner;

  /**
   * @ignore
   */
  constructor(options: {
    genesis: NetworkResource;
    run: Process.ProcessorRunner;
  }) {
    this._incongruent = [];
    this._genesis = options.genesis;
    this._latest = options.genesis;
    this._run = options.run;
  }
}

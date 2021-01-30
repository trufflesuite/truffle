/**
 * # Network abstraction for @truffle/db
 *
 * This provides a TypeScript (or JavaScript) interface for loading blockchain
 * network information into a running [[Db]].
 *
 * ## Usage
 *
 * ```typescript
 * // you'll need a provider
 * import type { Provider } from "web3/providers";
 * declare const provider: Provider;
 *
 * // relevant imports
 * import { connect, Network } from "@truffle/db";
 *
 * const db = connect({
 *   // ...
 * });
 *
 * const network = await Network.initialize({
 *   db,
 *   provider,
 *   network: {
 *     name: "development"
 *   }
 * });
 *
 * // load specific blocks
 * await network.recordBlocks({
 *   blocks: [
 *     { height: 10, hash: "0x..." },
 *     // ...
 *   ]
 * });
 *
 * // and/or load transactions
 * await network.recordTransactions({
 *   transactionHashes: [
 *     "0x...",
 *     // ...
 *   ]
 * });
 *
 * // then tell abstraction to relate recorded information with existing
 * // information in @truffle/db
 * await network.congrueGenealogy();
 * ```
 *
 *
 * @packageDocumentation
 */
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
import * as FetchBlockForHeight from "./fetchBlockForHeight";
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

export type InitializeOptions = {
  network: Omit<Input<"networks">, "networkId" | "historicBlock">;
} & (
  | { db: Db; provider: Provider }
  | ReturnType<ReturnType<typeof Process.Run.forDb>["forProvider"]>
);

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

  async recordLatest(): Promise<IdObject<"networks">> {
    const block = await this.run(FetchBlockForHeight.process, {
      height: "latest" as const
    });

    const [network] = await this.recordBlocks({ blocks: [block] });
    return network;
  }

  async recordBlocks<
    Block extends DataModel.Block | Omit<DataModel.Block, "hash">
  >(options: { blocks: Block[] }): Promise<IdObject<"networks">[]> {
    const blocks: DataModel.Block[] = await Promise.all(
      options.blocks.map(async block =>
        "hash" in block
          ? (block as DataModel.Block)
          : await this.run(FetchBlockForHeight.process, {
              height: block.height
            })
      )
    );

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

    const blocks = await this.run(FetchTransactionBlocks.process, {
      transactionHashes
    });

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

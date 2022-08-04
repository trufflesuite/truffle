/**
 * # Network abstraction for @truffle/db
 *
 * This provides a TypeScript (or JavaScript) interface for loading blockchain
 * network information into a running [[Db]].
 *
 * See the [Network abstraction](../#network-abstraction) section of this
 * documentation's index page for an overview of the purpose this abstraction
 * serves, or see the [[Network.includeBlocks | `Network.includeBlocks()`]]
 * method documentation for a bit more detail.
 *
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network");

import type { Web3BaseProvider as Provider } from "web3-types";

import * as Process from "@truffle/db/process";
import {
  Db,
  DataModel,
  Input,
  Resource,
  IdObject,
  toIdObject
} from "@truffle/db/resources";

import * as Fetch from "./fetch";
import * as Query from "./query";
import * as Load from "./load";
export { Fetch, Query, Load };

type NetworkResource = Pick<
  Resource<"networks">,
  "id" | keyof Input<"networks">
>;

/**
 * As described in the documentation for
 * [[Network.includeBlocks | `Network.includeBlocks()`]], these
 * settings may help mitigate unforeseen problems with large data sets.
 */
export type IncludeSettings = {
  /**
   * Skip final query at end of this operation that determines canonical known
   * latest after the operation completes.
   *
   * If set to `true`, this operation will update [[Network.knownLatest]]
   * using only information already present in the abstraction instance as well
   * as information passed as input.
   *
   * @default false
   */
  skipKnownLatest?: boolean;

  /**
   * Force the underlying persistence adapter to disable use of certain
   * database indexes. This option exists for purposes of testing fallback
   * behavior for persistence query generation failure. You probably don't
   * need to use this, but it may help diagnose problems when using the IndexedDb
   * adapter if you see errors about excessive SQL query parameters.
   *
   * @default false
   */
  disableIndex?: boolean;
};

/**
 * Options for constructing a [[Network]] abstraction, required by
 * [[initialize | `initialize()`]].
 *
 * These options must include either:
 *   - `db`, a [[Db]] instance and `provider`, JSON-RPC provider
 *     (for normal use), or
 *   - `run`, a provider-enabled [[Process.ProcessorRunner]] function, e.g. one
 *     instantiated via [[Process.Run.forDb]] (for internal/special-case use).
 *
 * In addition, these options must contain `network` with `name` information,
 * as per the [[DataModel.NetworkInput | Network input]] specification.
 *
 * Optionally this may include `settings` to specify [[IncludeSettings]].
 *
 * @category Constructor
 */
export type InitializeOptions = {
  network: Omit<Input<"networks">, "networkId" | "historicBlock">;
  settings?: IncludeSettings;
} & (
  | { db: Db; provider: Provider }
  | ReturnType<ReturnType<typeof Process.Run.forDb>["forProvider"]>
);

/**
 * Construct a [[Network]] abstraction for given [[InitializeOptions]].
 *
 * Example:
 * ```typescript
 * import type { Web3BaseProvider as Provider } from "web3-common";
 * import { db, Network } from "@truffle/db";
 *
 * declare const provider: Provider; // obtain this somehow
 *
 * const db = connect({
 *   // ...
 * });
 *
 * const network = await Network.initialize({
 *   db,
 *   provider,
 *   network: {
 *     name: "mainnet"
 *   }
 * });
 * ```
 *
 * @category Constructor
 */
export async function initialize(options: InitializeOptions): Promise<Network> {
  const { run } =
    "db" in options && "provider" in options
      ? Process.Run.forDb(options.db).forProvider(options.provider)
      : options;

  const {
    network: { name },
    settings
  } = options;

  const networkId = await run(Fetch.NetworkId.process);
  const genesisBlock = await run(Fetch.Block.process, { block: { height: 0 } });

  const {
    latest,
    networks: [genesis]
  } = await Network.collectBlocks({
    run,
    network: { name, networkId },
    blocks: [genesisBlock],
    settings
  });

  if (!genesis) {
    throw new Error("Unable to fetch genesis block");
  }

  return new Network({ genesis, latest, run });
}

/**
 * @category Abstraction
 */
export class Network {
  /**
   * Network resource ([[DataModel.Network | Resources.Resource<"networks">]])
   * representing the genesis block for the connected blockchain.
   *
   * @category Resource accessors
   */
  get genesis(): NetworkResource {
    return this._genesis;
  }

  /**
   * Network resource ([[DataModel.Network | Resources.Resource<"networks">]])
   * representing the latest known block for the connected blockchain.
   *
   * After [[initialize | `Network.initialize()`]], [[`includeLatest`]],
   * [[`includeBlocks`]], and [[`includeTransactions`]], by default this value
   * will be computed (or re-computed) based on inputs as well as queried
   * records in \@truffle/db already. Use `skipKnownLatest` option in
   * [[IncludeSettings]] to update based only on existing known latest and
   * additional inputs.
   *
   * @category Resource accessors
   */
  get knownLatest(): NetworkResource {
    return this._knownLatest;
  }

  /**
   * Fetch the latest block for the connected blockchain and load relevant
   * resources into @truffle/db in order to link with existing records.
   *
   * See [[includeBlocks]] for more detail.
   *
   * @category Methods
   */
  async includeLatest(
    options: {
      settings?: IncludeSettings;
    } = {}
  ): Promise<IdObject<"networks"> | undefined> {
    const { settings } = options;

    const block = await this.run(Fetch.Block.process, {
      block: { height: "latest" as const }
    });
    debug("block %O", block);

    const [network] = await this.includeBlocks({
      blocks: [block],
      settings
    });

    return network;
  }

  /**
   * Fetch blocks for given transaction hashes for the connected blockchain
   * and load relevant resources into @truffle/db in order to link with
   * existing records.
   *
   * See [[includeBlocks]] for more detail.
   *
   * @category Methods
   */
  async includeTransactions(options: {
    transactionHashes: (string | undefined)[];
    settings?: IncludeSettings;
  }): Promise<(IdObject<"networks"> | undefined)[]> {
    if (options.transactionHashes.length === 0) {
      return [];
    }

    const { transactionHashes } = options;

    const blocks = await Promise.all(
      transactionHashes.map(async transactionHash =>
        transactionHash
          ? await this.run(Fetch.TransactionBlock.process, { transactionHash })
          : undefined
      )
    );

    return await this.includeBlocks({ blocks });
  }

  /**
   * **Load relevant resources into @truffle/db for a given set of blocks for
   * the connected blockchain.** Provide either height or height and hash for
   * each block; this method will fetch hashes for block heights for any blocks
   * provided without hash.
   *
   * This method queries @truffle/db for existing resources to build a sparse
   * model of the relationships between blockchain networks. This mechanism
   * identifies blockchain networks as
   * [[DataModel.Network | Network]] resources and
   * utilizes a system of
   * [[DataModel.NetworkGenealogy | NetworkGenealogy]]
   * resources to identify blocks as being ancestor or descendant to one
   * another. **This allows @truffle/db to maintain a continuous view of any
   * particular blockchain while respecting that networks may hard-fork or
   * re-organize in the future.**
   *
   * To complete these linkages, this method alternately queries @truffle/db
   * for candidate ancestors/descendants and fetches actual records from the
   * connected blockchain itself until it finds an optimal match.
   * This process operates in logarithmic time and logarithmic space based on
   * the number of existing known blocks in the system and the number of blocks
   * provided as input.
   *
   * **Note**: Despite optimizing for speed and memory usage, this process can
   * nonetheless still perform a significant number of network requests and
   * internal database reads. Although this system has been tested to perform
   * satisfactorily against tens of thousands of blocks with multiple hardfork
   * scenarios, this abstraction provides a few [[IncludeSettings]] to migitate
   * unforeseen issues.
   *
   * This returns an [[IdObject]] for each [[DataModel.Network]] resource added
   * in the process. Return values are ordered so that indexes of returned IDs
   * correspond to indexes of provided blocks; any blocks that fail to load
   * successfully will correspond to values of `null` or `undefined` in the
   * resulting array.
   *
   * @category Methods
   */
  async includeBlocks<
    Block extends DataModel.Block | Omit<DataModel.Block, "hash">
  >(options: {
    blocks: (Block | undefined)[];
    settings?: IncludeSettings;
  }): Promise<(IdObject<"networks"> | undefined)[]> {
    if (options.blocks.length === 0) {
      return [];
    }

    const { settings } = options;

    const blocks: (DataModel.Block | undefined)[] = await Promise.all(
      options.blocks.map(async block =>
        block
          ? await this.run(Fetch.Block.process, {
              block,
              settings: { skipComplete: true }
            })
          : undefined
      )
    );

    const { networks, latest } = await Network.collectBlocks({
      run: this.run,
      network: this.genesis,
      blocks,
      settings
    });

    debug("latest %O", latest);

    if (
      latest &&
      latest.historicBlock.height > this._knownLatest.historicBlock.height
    ) {
      this._knownLatest = latest;
    }

    return networks.map((network: NetworkResource | undefined) =>
      toIdObject<"networks">(network)
    );
  }

  /*
   * internals
   */

  /**
   * @hidden
   */
  private _genesis: NetworkResource;
  /**
   * @hidden
   */
  private _knownLatest: NetworkResource;
  /**
   * @hidden
   */
  private run: Process.ProcessorRunner;
  /**
   * @hidden
   */
  static async collectBlocks(options: {
    run: Process.ProcessorRunner;
    network: Pick<Input<"networks">, "name" | "networkId">;
    blocks: (DataModel.Block | undefined)[];
    settings?: {
      skipKnownLatest?: boolean;
      disableIndex?: boolean;
    };
  }): Promise<{
    networks: (NetworkResource | undefined)[];
    latest: NetworkResource | undefined;
  }> {
    if (options.blocks.length === 0) {
      throw new Error("Zero blocks provided.");
    }

    const {
      run,
      network: { name, networkId },
      blocks,
      settings: { skipKnownLatest = false, disableIndex = false } = {}
    } = options;

    debug("blocks %O", blocks);

    const networks = await run(Load.NetworksForBlocks.process, {
      network: { name, networkId },
      blocks
    });

    await run(Load.NetworkGenealogies.process, {
      networks,
      settings: { disableIndex }
    });

    debug("networks %O", networks);
    const definedNetworks = networks.filter(
      (network): network is NetworkResource => !!network
    );
    const loadedLatest: NetworkResource | undefined = definedNetworks
      .slice(1)
      .reduce(
        (a, b) => (a.historicBlock.height > b.historicBlock.height ? a : b),
        definedNetworks[0]
      );

    const latest = !loadedLatest
      ? undefined
      : skipKnownLatest
      ? loadedLatest
      : await run(Fetch.KnownLatest.process, { network: loadedLatest });

    return {
      networks,
      latest
    };
  }

  /**
   * @ignore
   */
  constructor(options: {
    genesis: NetworkResource;
    latest?: NetworkResource;
    run: Process.ProcessorRunner;
  }) {
    this._genesis = options.genesis;
    this._knownLatest = options.latest || options.genesis;
    this.run = options.run;
  }
}

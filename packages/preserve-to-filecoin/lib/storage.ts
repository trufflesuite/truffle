import chalk from "chalk";
import CID from "cids";
import type * as Preserve from "@truffle/preserve";
import type { LotusClient } from "filecoin.js";

export interface StorageDealOptions {
  walletAddress?: string;
  epochPrice?: string;
  duration?: number;
}

export interface ProposeStorageDealOptions {
  cid: CID;
  client: LotusClient;
  miners: string[];
  storageDealOptions: StorageDealOptions;
  controls: Preserve.Controls;
}

export interface StorageProposalResult {
  dealCid: CID;
}

export async function* proposeStorageDeal(
  options: ProposeStorageDealOptions
): Preserve.Process<StorageProposalResult> {
  const { cid, client, storageDealOptions, miners, controls } = options;
  const { walletAddress, epochPrice, duration } = storageDealOptions;
  const { step } = controls;

  const task = yield* step({
    message: "Proposing storage deal..."
  });

  const dealCidResolution = yield* task.declare({
    identifier: "Deal CID"
  });

  const wallet = walletAddress || await client.wallet.getDefaultAddress();

  // TODO: Allow making a deal with multiple miners
  const storageProposal = {
    Data: {
      TransferType: "graphsync",
      Root: { "/": cid.toString() }
    },
    Wallet: wallet,
    Miner: miners[0],
    EpochPrice: epochPrice,
    MinBlocksDuration: duration
  };

  try {
    const result = await client.client.startDeal(storageProposal);

    const dealCid = new CID(result["/"]);

    yield* dealCidResolution.resolve({
      resolution: dealCid,
      payload: chalk.bold(dealCid.toString())
    });

    yield* task.succeed();

    return { dealCid };
  } catch (error) {
    yield* task.fail({ error });
  }
}

import chalk from "chalk";
import CID from "cids";
import * as Preserve from "@truffle/preserve";
import { LotusClient } from "filecoin.js";

export interface ProposeStorageDealOptions {
  cid: CID;
  client: LotusClient;
  miners: string[];
  controls: Preserve.Controls;
}

export interface StorageProposalResult {
  dealCid: CID;
}

export async function* proposeStorageDeal(
  options: ProposeStorageDealOptions
): Preserve.Process<StorageProposalResult> {
  const { cid, client, miners, controls } = options;
  const { step } = controls;

  const task = yield* step({
    message: "Proposing storage deal..."
  });

  const dealCidResolution = yield* task.declare({
    identifier: "Deal CID"
  });

  const defaultWalletAddress = await client.wallet.getDefaultAddress();

  // TODO: Make some of these values configurable
  // TODO: Allow making a deal with multiple miners
  const storageProposal = {
    Data: {
      TransferType: "graphsync",
      Root: { "/": cid.toString() }
    },
    Wallet: defaultWalletAddress,
    Miner: miners[0],
    EpochPrice: "2500",
    MinBlocksDuration: 518400 // Min 180 days
  };

  const result = await client.client.startDeal(storageProposal);

  const dealCid = new CID(result["/"]);

  yield* dealCidResolution.resolve({
    resolution: dealCid,
    payload: chalk.bold(dealCid.toString())
  });

  yield* task.succeed();

  return { dealCid };
}

import chalk from "chalk";
import CID from "cids";
import * as Preserve from "@truffle/preserve";
import { LotusClient } from "./connect";
import { Miner } from "./miners";

export interface ProposeStorageDealOptions {
  cid: CID;
  client: LotusClient;
  miners: Miner[];
  controls: Preserve.Controls;
}

export interface StorageProposalResult {
  dealCid: CID;
}

export interface StorageProposal {
  Data: {
    TransferType: string;
    Root: {
      "/": string;
    };
    PieceCid: any;
    PieceSize: number;
  };
  Wallet: string;
  Miner: string;
  EpochPrice: string;
  MinBlocksDuration: number;
}

export async function* proposeStorageDeal(
  options: ProposeStorageDealOptions
): Preserve.Process<StorageProposalResult> {
  const {
    cid,
    client,
    miners,
    controls: { step }
  } = options;

  const task = yield* step({
    message: "Proposing storage deal..."
  });

  const dealCidResolution = yield* task.declare({
    identifier: "Deal CID"
  });

  const defaultWalletAddress = await client.walletDefaultAddress();

  // TODO: Make some of these values configurable
  const storageProposal: StorageProposal = {
    Data: {
      TransferType: "graphsync",
      Root: {
        "/": cid.toV1().toString()
      },
      PieceCid: null,
      PieceSize: 0
    },
    Wallet: defaultWalletAddress,
    Miner: miners[0],
    EpochPrice: "2500",
    MinBlocksDuration: 300
  };

  const result = await client.clientStartDeal(storageProposal);

  const dealCid = new CID(result["/"]);

  yield* dealCidResolution.resolve({ payload: chalk.bold(dealCid.toString()) });

  yield* task.succeed();

  return { dealCid };
}

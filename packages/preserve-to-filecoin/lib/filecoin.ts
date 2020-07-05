import { asyncLast } from "iter-tools";
const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;
const BrowserProvider = require("@filecoin-shipyard/lotus-client-provider-browser")
  .BrowserProvider;
import Websocket from "isomorphic-ws";
const fetch = require("node-fetch");

import { dealstates, terminalStates } from "./dealstates";

import CID from "cids";

import * as Preserve from "@truffle/preserve";

export type IPFSCidGetter = (target: Preserve.Target) => Promise<CID>;

export const defaultAddress: string = "ws://localhost:7777/0/node/rpc/v0";

// Do to some import issues with jest + @filecoin-shipyard/lotus-client-schema/prototype/testnet-v3
// I decided to just create the schema for all methods used by preserve-to-filecoin.
// The schema is required by the LotusRPC library, and is no more than a list of method names
type FilecoinMethodSchema = {
  methods: { [key: string]: object };
};

export interface PreserveToFilecoinOptions {
  target: Preserve.Target;
  filecoin: {
    address: string;
  };
  getIPFSCidForTarget: IPFSCidGetter;
}

export interface CreateLotusClientOptions {
  wsUrl: string;
}

export type LotusClient = any;

export interface FilecoinStorageProposal {
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

export interface FilecoinStorageResult {
  "/": string;
}

export const createLotusClient = (
  options: CreateLotusClientOptions
): LotusClient => {
  const schema = <FilecoinMethodSchema>{
    methods: {
      ClientStartDeal: {},
      ClientListDeals: {},
      StateListMiners: {},
      WalletDefaultAddress: {}
    }
  };
  const provider = new BrowserProvider(options.wsUrl, {
    WebSocket: Websocket,
    fetch: fetch
  });
  return new LotusRPC(provider, { schema });
};

export const preserveToFilecoin = async (
  options: PreserveToFilecoinOptions
): Promise<FilecoinStorageResult> => {
  if (Preserve.Targets.Sources.isContent(options.target.source)) {
    throw new Error(
      "@truffle/preserve-to-filecoin only supports preserving directories at this time."
    );
  }

  const wsUrl = options.filecoin.address || defaultAddress;
  const client = createLotusClient({ wsUrl });
  const cid = await options.getIPFSCidForTarget(options.target);

  const miners = await client.stateListMiners([]);
  const defaultWalletAddress = await client.walletDefaultAddress();

  // TODO: Make some of these values configurable
  const storageProposal = <FilecoinStorageProposal>{
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

  const proposalResult: FilecoinStorageResult = await client.clientStartDeal(
    storageProposal
  );

  return waitForDealToFinish(proposalResult["/"], client).then(() => {
    return proposalResult;
  });
};

export async function getDealState(
  dealCid: string,
  client: any
): Promise<string> {
  const clientDeals = await client.clientListDeals();

  const [deal] = clientDeals.filter((d: any) => {
    return d.ProposalCid["/"] == dealCid;
  });

  return dealstates[deal.State];
}

async function waitForDealToFinish(dealCid: string, client: any) {
  var accept: Function, reject: Function;
  var p = new Promise((a, r) => {
    accept = a;
    reject = r;
  });

  var interval = setInterval(async () => {
    const state = await getDealState(dealCid, client);

    if (state == "Active") {
      clearInterval(interval);
      return accept(state);
    } else if (terminalStates.indexOf(state) >= 0) {
      clearInterval(interval);
      return reject(new Error("Deal failed with state: " + state));
    }
  }, 1000);

  return p;
}

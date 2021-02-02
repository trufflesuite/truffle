const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;
const BrowserProvider = require("@filecoin-shipyard/lotus-client-provider-browser")
  .BrowserProvider;
const fetch = require("node-fetch");
import Websocket from "isomorphic-ws";
import * as Preserve from "@truffle/preserve";

export interface ConnectOptions {
  address: string;
  controls: Preserve.Controls;
}

export type LotusClient = any;

export async function* connect(
  options: ConnectOptions
): Preserve.Process<LotusClient> {
  const { address, controls } = options;
  const { step } = controls;

  const task = yield* step({
    message: `Connecting to Filecoin node at ${address}...`
  });

  const client = createLotusClient({ address });

  yield* task.succeed();

  return client;
}

interface CreateLotusClientOptions {
  address: string;
}

// Do to some import issues with jest + @filecoin-shipyard/lotus-client-schema/prototype/testnet-v3
// I decided to just create the schema for all methods used by preserve-to-filecoin.
// The schema is required by the LotusRPC library, and is no more than a list of method names
type FilecoinMethodSchema = {
  methods: { [key: string]: object };
};

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
  const provider = new BrowserProvider(options.address, {
    WebSocket: Websocket,
    fetch: fetch
  });
  return new LotusRPC(provider, { schema });
};

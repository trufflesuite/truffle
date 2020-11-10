import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:networks");

import { IdObject } from "@truffle/db/meta";
import { Process, resources } from "@truffle/db/project/process";

import { GetNetwork } from "./get.graphql";

type TransactionHash = any;

export function* generateNetworkGet({
  id
}: IdObject<DataModel.Network>): Process<DataModel.Network | undefined> {
  debug("Generating network get...");

  const response = yield {
    type: "graphql",
    request: GetNetwork,
    variables: {
      id
    }
  };

  const network = response.data.network;

  debug("Generated network get.");
  return network;
}

export interface GenerateTransactionNetworkLoadOptions {
  transactionHash: TransactionHash;
  network: Pick<DataModel.NetworkInput, "name" | "networkId">;
}

export function* generateTranasctionNetworkLoad({
  transactionHash,
  network: { name, networkId }
}: GenerateTransactionNetworkLoadOptions): Process<DataModel.Network> {
  debug("Generating transaction network load...");
  const historicBlock = yield* generateHistoricBlockFetch(transactionHash);

  const result = yield* generateNetworkLoad({
    name,
    networkId,
    historicBlock
  });

  debug("Generated transaction network load.");
  return result;
}

export function* generateNetworkIdFetch(): Process<
  any,
  { web3: "net_version" }
> {
  debug("Generating networkId fetch...");

  const response = yield {
    type: "web3",
    method: "net_version"
  };

  const { result } = response;

  const networkId = parseInt(result);

  debug("Generated networkId fetch.");
  return networkId;
}

function* generateHistoricBlockFetch(
  transactionHash: TransactionHash
): Process<DataModel.Block, { web3: "eth_getTransactionByHash" }> {
  debug("Generating historic block fetch...");

  const response = yield {
    type: "web3",
    method: "eth_getTransactionByHash",
    params: [transactionHash]
  };

  const {
    result: { blockNumber, blockHash: hash }
  } = response;

  const height = parseInt(blockNumber);

  const historicBlock = { height, hash };

  debug("Generated historic block fetch.");
  return historicBlock;
}

function* generateNetworkLoad(
  input: DataModel.NetworkInput
): Process<DataModel.Network> {
  debug("Generating network load...");
  const [network] = yield* resources.load("networks", [input]);
  debug("Generated network load.");
  return network;
}

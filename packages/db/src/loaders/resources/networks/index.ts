import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:networks");

import gql from "graphql-tag";
import { generate } from "@truffle/db/generate";
import { Process } from "@truffle/db/resources";

type TransactionHash = any;

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

  const [{ id }] = yield* generate.load("networks", [
    {
      name,
      networkId,
      historicBlock
    }
  ]);

  const network = yield* generate.get(
    "networks",
    id,
    gql`
      fragment Network on Network {
        id
        historicBlock {
          height
        }
      }
    `
  );

  debug("Generated transaction network load.");
  return network;
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

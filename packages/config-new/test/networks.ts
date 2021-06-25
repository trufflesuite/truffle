import * as t from "io-ts";

import * as Network from "@truffle/config-new/networks";

type Type<T> = T extends t.Type<infer U> ? U : never;

export const ethereumNetwork = t.type({
  jsonrpcUrl: t.string,
  networkId: t.number
});

export type EthereumNetwork = Type<typeof ethereumNetwork>;

export const ethereumConfig = Network.config({
  networkKind: "ethereum" as const,
  network: ethereumNetwork
});

export type EthereumConfig = Type<typeof ethereumConfig>;

export const ipfsNetwork = t.type({
  url: t.string
});

export type IpfsNetwork = Type<typeof ipfsNetwork>;

export const ipfsConfig = Network.config({
  networkKind: "ipfs" as const,
  network: ipfsNetwork
});

export type IpfsConfig = Type<typeof ipfsConfig>;

export const dualConfig = t.intersection([ethereumConfig, ipfsConfig]);

export type DualConfig = Type<typeof dualConfig>;

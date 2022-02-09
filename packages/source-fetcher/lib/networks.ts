import type * as Types from "./types";

export const networkNamesById: { [id: number]: string } = {
  1: "mainnet",
  3: "ropsten",
  4: "rinkeby",
  5: "goerli",
  42: "kovan",
  10: "optimistic",
  69: "kovan-optimistic",
  42161: "arbitrum",
  137: "polygon"
};

export const networksByName: Types.SupportedNetworks = Object.fromEntries(
  Object.entries(networkNamesById).map(
    ([id, name]) => [name, { name, networkId: Number(id), chainId: Number(id) }] //id is a string since it's a key so must use Number()
  )
);

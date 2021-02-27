import * as Preserve from "@truffle/preserve";
import * as PreserveToIpfs from "@truffle/preserve-to-ipfs";
import CID from "cids";
import { Recipe } from "../../lib";
import { asyncToArray } from "iter-tools";

export const preserveToIpfs = async (
  target: Preserve.Target,
  address: string
) => {
  const recipe = new PreserveToIpfs.Recipe({ address });

  const { cid }: PreserveToIpfs.Result = await Preserve.Control.run(
    {
      method: recipe.preserve.bind(recipe)
    },
    { target }
  );

  return cid;
};

export const preserveToFilecoin = async (
  target: Preserve.Target,
  cid: CID,
  address: string
) => {
  const recipe = new Recipe({ address });

  const { dealCid } = await Preserve.Control.run(
    {
      name: recipe.name,
      method: recipe.preserve.bind(recipe)
    },
    {
      target: target,
      results: new Map([["@truffle/preserve-to-ipfs", { cid }]])
    }
  );

  return dealCid;
};

export const preserveToFilecoinWithEvents = async (
  target: Preserve.Target,
  cid: CID,
  address: string
) => {
  const recipe = new Recipe({ address });

  const emittedEvents = await asyncToArray(
    Preserve.Control.control(
      {
        name: recipe.name,
        method: recipe.preserve.bind(recipe)
      },
      {
        target: target,
        results: new Map([["@truffle/preserve-to-ipfs", { cid }]])
      }
    )
  );

  return emittedEvents;
};

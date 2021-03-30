import * as Preserve from "@truffle/preserve";
import * as PreserveToIpfs from "@truffle/preserve-to-ipfs";
import CID from "cids";
import { ConstructorOptions, Recipe } from "../../lib";
import { asyncToArray } from "iter-tools";

export const preserveToIpfs = async (
  target: Preserve.Target,
  address: string
) => {
  const recipe = new PreserveToIpfs.Recipe({ address });

  const { "ipfs-cid": cid }: PreserveToIpfs.Result = await Preserve.Control.run(
    {
      method: recipe.execute.bind(recipe)
    },
    {
      inputs: {
        "fs-target": target
      }
    }
  );

  return cid;
};

export const preserveToFilecoin = async (
  target: Preserve.Target,
  cid: CID,
  environment: ConstructorOptions
): Promise<CID> => {
  const recipe = new Recipe(environment);

  const { "filecoin-deal-cid": dealCid } = await Preserve.Control.run(
    {
      name: recipe.name,
      method: recipe.execute.bind(recipe)
    },
    {
      inputs: {
        "fs-target": target,
        "ipfs-cid": cid,
      }
    }
  );

  return dealCid;
};

export const preserveToFilecoinWithEvents = async (
  target: Preserve.Target,
  cid: CID,
  environment: ConstructorOptions
) => {
  const recipe = new Recipe(environment);

  const emittedEvents = await asyncToArray(
    Preserve.Control.control(
      {
        name: recipe.name,
        method: recipe.execute.bind(recipe)
      },
      {
        inputs: {
          "fs-target": target,
          "ipfs-cid": cid,
        }
      }
    )
  );

  return emittedEvents;
};

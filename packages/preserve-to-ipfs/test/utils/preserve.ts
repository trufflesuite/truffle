import * as Preserve from "@truffle/preserve";
import { Recipe, Result } from "../../lib";
import { asyncToArray } from "iter-tools";

export const preserveToIpfs = async (
  target: Preserve.Target,
  address: string
) => {
  const recipe = new Recipe({ address });

  const { "ipfs-cid": cid }: Result = await Preserve.Control.run(
    {
      method: recipe.execute.bind(recipe)
    },
    { inputs: { "fs-target": target } }
  );

  return cid;
};

export const preserveToIpfsWithEvents = async (
  target: Preserve.Target,
  address: string
) => {
  const recipe = new Recipe({ address });

  const emittedEvents = await asyncToArray(
    Preserve.Control.control(
      {
        name: recipe.name,
        method: recipe.execute.bind(recipe)
      },
      { inputs: { "fs-target": target } }
    )
  );

  return emittedEvents;
};

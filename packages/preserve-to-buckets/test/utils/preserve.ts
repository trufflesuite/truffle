import * as Preserve from "@truffle/preserve";
import { ConstructorOptions, Recipe } from "../../lib";
import { asyncToArray } from "iter-tools";

export const preserveToBuckets = async (
  target: Preserve.Target,
  environment: ConstructorOptions,
) => {
  const recipe = new Recipe(environment);

  const result = await Preserve.Control.run(
    {
      name: recipe.name,
      method: recipe.preserve.bind(recipe)
    },
    { target: target }
  );

  return result;
};

export const preserveToBucketsWithEvents = async (
  target: Preserve.Target,
  environment: ConstructorOptions,
) => {
  const recipe = new Recipe(environment);

  const emittedEvents = await asyncToArray(
    Preserve.Control.control(
      {
        name: recipe.name,
        method: recipe.preserve.bind(recipe)
      },
      { target }
    )
  );

  return emittedEvents;
};

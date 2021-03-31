import * as Preserve from "@truffle/preserve";
import { Recipe, ExecuteResult } from "../../lib";
import { asyncToArray } from "iter-tools";

export const preserve = async (
  inputs: { path: string },
  settings: { verbose?: boolean } = {}
): Promise<ExecuteResult> => {
  const recipe = new Recipe();

  const result: ExecuteResult = await Preserve.Control.run(
    {
      name: recipe.name,
      method: recipe.execute.bind(recipe)
    },
    { inputs, settings }
  );

  return result;
};

export const preserveWithEvents = async (
  inputs: { path: string },
  settings: { verbose?: boolean } = {}
) => {
  const recipe = new Recipe();

  const emittedEvents = await asyncToArray(
    Preserve.Control.control(
      {
        name: recipe.name,
        method: recipe.execute.bind(recipe)
      },
      { inputs, settings }
    )
  );

  return emittedEvents;
};

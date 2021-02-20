import { asyncToArray } from "iter-tools";

import { preserve } from "../lib/preserve";
import {
  expectedEventsForVowelsCounterRecipe,
  expectedEventsForVowelsRecipe,
  simpleLoader,
  vowelsCounterRecipe,
  vowelsRecipe
} from "./preserve.fixture";

const mapByName = <T extends { name: string }>(entities: T[]): Map<string, T> =>
  new Map(entities.map(entity => [entity.name, entity]));

const loaders = mapByName([simpleLoader]);
const recipes = mapByName([vowelsRecipe, vowelsCounterRecipe]);

it("preserves via a single recipe", async () => {
  const events = await asyncToArray(
    preserve({
      request: {
        loader: simpleLoader.name,
        recipe: vowelsRecipe.name
      },
      loaders,
      recipes
    })
  );

  expect(events).toEqual(expectedEventsForVowelsRecipe);
});

it("preserves via a recipe that depends on another recipe", async () => {
  const allEvents = await asyncToArray(
    preserve({
      request: {
        loader: simpleLoader.name,
        recipe: vowelsCounterRecipe.name
      },
      loaders,
      recipes
    })
  );

  const relevantEvents = allEvents.filter(
    ({ scope }) => scope[0] === "vowels-counter-recipe"
  );

  expect(relevantEvents).toEqual(expectedEventsForVowelsCounterRecipe);
});

import { asyncToArray } from "iter-tools";

import { preserve } from "../lib/preserve";
import {
  expectedEventsForVowelsCounterRecipe,
  expectedEventsForVowelsRecipe,
  simpleLoader,
  vowelsCounterRecipe,
  vowelsRecipe
} from "./preserve.fixture";

const recipes = [simpleLoader, vowelsRecipe, vowelsCounterRecipe];

it("preserves via a single recipe", async () => {
  const events = await asyncToArray(
    preserve({
      request: { recipe: vowelsRecipe },
      recipes,
    })
  );

  expect(events).toEqual(expectedEventsForVowelsRecipe);
});

it("preserves via a recipe that depends on another recipe", async () => {
  const allEvents = await asyncToArray(
    preserve({
      request: { recipe: vowelsCounterRecipe },
      recipes,
    })
  );

  const relevantEvents = allEvents.filter(
    ({ scope }) => scope[0] === "vowels-counter-recipe"
  );

  expect(relevantEvents).toEqual(expectedEventsForVowelsCounterRecipe);
});

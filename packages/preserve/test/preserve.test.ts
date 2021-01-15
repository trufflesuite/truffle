import { asyncToArray } from "iter-tools";

import { Target, stringify } from "../lib/targets";
import { Recipe } from "../lib/recipes";
import { Loader } from "../lib/loaders";
import { Process, ValueResolutionController } from "../lib/control";
import { preserve } from "../lib/preserve";

const simpleTarget: Target = {
  source: "hello, world!"
};

const simpleLoader: Loader = {
  name: "simple-loader",

  async *load() {
    return simpleTarget;
  }
};

const vowelsRecipe: Recipe = {
  name: "vowels-recipe",

  dependencies: [],

  async *preserve({ target, controls }): Process<{ vowels: string }> {
    const { log, step } = controls;
    yield* log({ message: "Filtering vowels..." });

    const vowels = new Set(["a", "e", "i", "o", "u"]);

    // for testing purposes, this only handles the case of a Content target
    // (no Containers)
    const source = (await stringify(target)).source as string;

    const finalize = yield* step({
      identifier: "finalize",
      message: "Finalizing string..."
    });

    yield* finalize.succeed();

    return {
      vowels: source
        .split("")
        .filter(character => vowels.has(character))
        .join("")
    };
  }
};

const vowelsCounterRecipe: Recipe = {
  name: "vowels-counter-recipe",

  dependencies: [vowelsRecipe.name],

  async *preserve({ results, controls }): Process<{ count: number }> {
    const { log, declare } = controls;

    yield* log({ message: "Counting vowels..." });

    const allVowels = ["a", "e", "i", "o", "u"];

    const valueResolutions: { [vowel: string]: ValueResolutionController } = {};
    for (const vowel of allVowels) {
      valueResolutions[vowel] = yield* declare({
        identifier: vowel,
        message: `# of ${vowel}'s`
      });
    }

    const { vowels } = results.get(vowelsRecipe.name) as { vowels: string };

    const counts = allVowels
      .map(vowel => ({ [vowel]: { count: 0 } }))
      .reduce((a, b) => ({ ...a, ...b }), {});

    for (const vowel of vowels) {
      counts[vowel].count++;
    }

    for (const [vowel, valueResolution] of Object.entries(valueResolutions)) {
      yield* valueResolution.resolve({
        resolution: counts[vowel]
      });
    }

    return {
      count: vowels.length
    };
  }
};

const mapByName = <T extends { name: string }>(entities: T[]): Map<string, T> =>
  new Map(entities.map(entity => [entity.name, entity]));

const loaders = mapByName([simpleLoader]);
const recipes = mapByName([vowelsRecipe, vowelsCounterRecipe]);

it("preserves via a single recipe", async () => {
  const preserves = await asyncToArray(
    preserve({
      request: {
        loader: simpleLoader.name,
        recipe: vowelsRecipe.name
      },
      loaders,
      recipes
    })
  );

  expect(preserves).toEqual([
    {
      type: "begin",
      scope: ["simple-loader"]
    },
    {
      type: "succeed",
      scope: ["simple-loader"],
      result: { source: "hello, world!" }
    },
    {
      type: "begin",
      scope: ["vowels-recipe"]
    },
    {
      type: "log",
      scope: ["vowels-recipe"],
      message: "Filtering vowels..."
    },
    {
      type: "step",
      scope: ["vowels-recipe", "finalize"],
      message: "Finalizing string..."
    },
    {
      type: "succeed",
      scope: ["vowels-recipe", "finalize"]
    },
    {
      type: "succeed",
      scope: ["vowels-recipe"],
      result: { vowels: "eoo" }
    }
  ]);
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

  const relevantEvents = allEvents
    .filter(({ scope }) => scope[0] === "vowels-counter-recipe");

  expect(relevantEvents).toEqual([
    {
      type: "begin",
      scope: ["vowels-counter-recipe"]
    },
    {
      type: "log",
      scope: ["vowels-counter-recipe"],
      message: "Counting vowels..."
    },
    {
      type: "declare",
      scope: ["vowels-counter-recipe", "a"],
      message: "# of a's"
    },
    {
      type: "declare",
      scope: ["vowels-counter-recipe", "e"],
      message: "# of e's"
    },
    {
      type: "declare",
      scope: ["vowels-counter-recipe", "i"],
      message: "# of i's"
    },
    {
      type: "declare",
      scope: ["vowels-counter-recipe", "o"],
      message: "# of o's"
    },
    {
      type: "declare",
      scope: ["vowels-counter-recipe", "u"],
      message: "# of u's"
    },
    {
      type: "resolve",
      scope: ["vowels-counter-recipe", "a"],
      resolution: { count: 0 }
    },
    {
      type: "resolve",
      scope: ["vowels-counter-recipe", "e"],
      resolution: { count: 1 }
    },
    {
      type: "resolve",
      scope: ["vowels-counter-recipe", "i"],
      resolution: { count: 0 }
    },
    {
      type: "resolve",
      scope: ["vowels-counter-recipe", "o"],
      resolution: { count: 2 }
    },
    {
      type: "resolve",
      scope: ["vowels-counter-recipe", "u"],
      resolution: { count: 0 }
    },
    {
      type: "succeed",
      scope: ["vowels-counter-recipe"],
      result: { count: 3 }
    }
  ]);
});

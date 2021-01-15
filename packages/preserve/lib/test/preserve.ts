import {
  execPipe,
  filter,
  toArray,
  pipe,
  map,
  reduce,
  asyncToArray
} from "iter-tools";

import { Target, Loader, thunk } from "../targets";
import { Recipe } from "../recipes";
import { Process } from "../processes";
import * as Processes from "../processes";
import { PreserveOptions, preserve } from "../preserve";

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
    const source = (await thunk(target)).source as string;

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

  async *preserve({ labels, controls }): Process<{ count: number }> {
    const { log, declare } = controls;

    yield* log({ message: "Counting vowels..." });

    const allVowels = ["a", "e", "i", "o", "u"];

    const unknowns: { [vowel: string]: Processes.Unknown } = {};
    for (const vowel of allVowels) {
      unknowns[vowel] = yield* declare({
        identifier: vowel,
        message: `# of ${vowel}'s`
      });
    }

    const { vowels } = labels.get(vowelsRecipe.name) as { vowels: string };

    const counts = allVowels
      .map(vowel => ({ [vowel]: { count: 0 } }))
      .reduce((a, b) => ({ ...a, ...b }), {});

    for (const vowel of vowels) {
      counts[vowel].count++;
    }

    for (const [vowel, unknown] of Object.entries(unknowns)) {
      yield* unknown.resolve({
        label: counts[vowel]
      });
    }

    return {
      count: vowels.length
    };
  }
};

const mapByName = <T extends { name: string }>(entities: T[]): Map<string, T> =>
  new Map(entities.map(entity => [entity.name, entity]));

const loaders: PreserveOptions["loaders"] = mapByName([simpleLoader]);

const recipes: PreserveOptions["recipes"] = mapByName([
  vowelsRecipe,
  vowelsCounterRecipe
]);

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
      label: { source: "hello, world!" }
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
      label: {
        vowels: "eoo"
      }
    }
  ]);
});

it("preserves via a recipe that depends on another recipe", async () => {
  const preserves = await asyncToArray(
    preserve({
      request: {
        loader: simpleLoader.name,
        recipe: vowelsCounterRecipe.name
      },
      loaders,
      recipes
    })
  );

  const events = execPipe(
    preserves,
    filter(({ scope }) => scope[0] === "vowels-counter-recipe"),
    toArray
  );

  expect(events).toEqual([
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
      label: {
        count: 0
      }
    },
    {
      type: "resolve",
      scope: ["vowels-counter-recipe", "e"],
      label: {
        count: 1
      }
    },
    {
      type: "resolve",
      scope: ["vowels-counter-recipe", "i"],
      label: {
        count: 0
      }
    },
    {
      type: "resolve",
      scope: ["vowels-counter-recipe", "o"],
      label: {
        count: 2
      }
    },
    {
      type: "resolve",
      scope: ["vowels-counter-recipe", "u"],
      label: {
        count: 0
      }
    },
    {
      type: "succeed",
      scope: ["vowels-counter-recipe"],
      label: {
        count: 3
      }
    }
  ]);
});

const collectScopes = pipe(
  pipe(
    map(({ scope }) => scope),
    map(Processes.Scopes.toKey),
    reduce(new Set([]), (keys, key) => keys.add(key))
  ),

  map(Processes.Scopes.fromKey),

  toArray
);

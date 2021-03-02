import { Loader, Process, Recipe, Target } from "../lib";
import { ValueResolutionController } from "../lib/control";
import { stringify } from "../lib/targets";

export const simpleTarget: Target = {
  source: "hello, world!"
};

export const simpleLoader: Loader = {
  name: "simple-loader",

  async *load() {
    return simpleTarget;
  }
};

export const vowelsRecipe: Recipe = {
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

export const vowelsCounterRecipe: Recipe = {
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

export const expectedEventsForVowelsRecipe = [
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
];

export const expectedEventsForVowelsCounterRecipe = [
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
];
